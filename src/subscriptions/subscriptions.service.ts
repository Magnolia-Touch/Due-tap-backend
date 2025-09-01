import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto, PaginationMetaDto } from '../common/dto/pagination.dto';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionResponseDto,
  SubscriptionQueryDto,
} from './dto/subscription.dto';
import { SubscriptionStatus, DurationUnit } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscriptions(
    clientId: string,
    query: SubscriptionQueryDto,
  ): Promise<PaginatedResponseDto<SubscriptionResponseDto>> {
    const { page, limit, search, status, templateId, endUserId } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      clientId,
      ...(status && { status }),
      ...(templateId && { templateId }),
      ...(endUserId && { endUserId }),
      ...(search && {
        OR: [
          { endUser: { name: { contains: search, mode: 'insensitive' as const } } },
          { endUser: { email: { contains: search, mode: 'insensitive' as const } } },
          { template: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          endUser: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
              title: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    const data = subscriptions.map(subscription => ({
      id: subscription.id,
      clientId: subscription.clientId,
      endUserId: subscription.endUserId,
      templateId: subscription.templateId,
      amount: Number(subscription.amount),
      status: subscription.status,
      nextDueDate: subscription.nextDueDate,
      lastPaidDate: subscription.lastPaidDate,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      customOverrides: subscription.customOverrides,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      endUser: subscription.endUser,
      template: subscription.template,
    }));

    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return { data, meta };
  }

  async getSubscription(id: string, clientId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, clientId },
      include: {
        endUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            title: true,
            recurringDuration: true,
            durationUnit: true,
            notificationMethod: true,
            paymentMethod: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return {
      id: subscription.id,
      clientId: subscription.clientId,
      endUserId: subscription.endUserId,
      templateId: subscription.templateId,
      amount: Number(subscription.amount),
      status: subscription.status,
      nextDueDate: subscription.nextDueDate,
      lastPaidDate: subscription.lastPaidDate,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      customOverrides: subscription.customOverrides,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      endUser: subscription.endUser,
      template: subscription.template,
    };
  }

  async createSubscription(
    clientId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const { endUserId, templateId, amount, nextDueDate, startDate, endDate, customOverrides } = createSubscriptionDto;

    // Verify end user belongs to client
    const endUser = await this.prisma.endUser.findFirst({
      where: { id: endUserId, clientId },
    });

    if (!endUser) {
      throw new NotFoundException('End user not found');
    }

    // Verify template belongs to client
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, clientId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (!template.isActive) {
      throw new BadRequestException('Cannot create subscription with inactive template');
    }

    // Check for existing active subscription for this end user and template
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        endUserId,
        templateId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('Active subscription already exists for this user and template');
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        clientId,
        endUserId,
        templateId,
        amount,
        nextDueDate: new Date(nextDueDate),
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        customOverrides: customOverrides || {},
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        endUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            title: true,
          },
        },
      },
    });

    // Create first payment record
    await this.createPaymentForSubscription(subscription);

    return this.mapSubscriptionToResponse(subscription);
  }

  async updateSubscription(
    id: string,
    clientId: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, clientId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...updateSubscriptionDto,
        ...(updateSubscriptionDto.nextDueDate && {
          nextDueDate: new Date(updateSubscriptionDto.nextDueDate)
        }),
        ...(updateSubscriptionDto.startDate && {
          startDate: new Date(updateSubscriptionDto.startDate)
        }),
        ...(updateSubscriptionDto.endDate && {
          endDate: new Date(updateSubscriptionDto.endDate)
        }),
        ...(updateSubscriptionDto.lastPaidDate && {
          lastPaidDate: new Date(updateSubscriptionDto.lastPaidDate)
        }),
      },
      include: {
        endUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            title: true,
          },
        },
      },
    });

    return this.mapSubscriptionToResponse(updatedSubscription);
  }

  async pauseSubscription(id: string, clientId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, clientId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be paused');
    }

    await this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.PAUSED },
    });

    return { message: 'Subscription paused successfully' };
  }

  async resumeSubscription(id: string, clientId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, clientId },
      include: { template: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    // Calculate next due date based on template schedule
    const nextDueDate = this.calculateNextDueDate(
      new Date(),
      subscription.template.recurringDuration,
      subscription.template.durationUnit,
    );

    await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        nextDueDate,
      },
    });

    return { message: 'Subscription resumed successfully' };
  }

  async cancelSubscription(id: string, clientId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, clientId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    // Cancel pending payments
    await this.prisma.payment.updateMany({
      where: {
        subscriptionId: id,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        endDate: new Date(),
      },
    });

    return { message: 'Subscription cancelled successfully' };
  }

  async deleteSubscription(id: string, clientId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, clientId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Check for paid payments
    const paidPayments = await this.prisma.payment.count({
      where: { subscriptionId: id, status: 'PAID' },
    });

    if (paidPayments > 0) {
      throw new ForbiddenException(
        'Cannot delete subscription with payment history. Consider cancelling instead.',
      );
    }

    await this.prisma.subscription.delete({
      where: { id },
    });

    return { message: 'Subscription deleted successfully' };
  }

  async resendNotification(id: string, clientId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, clientId },
      include: {
        endUser: true,
        template: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Can only send notifications for active subscriptions');
    }

    // Get the latest pending payment for this subscription
    const pendingPayment = await this.prisma.payment.findFirst({
      where: {
        subscriptionId: id,
        status: 'PENDING',
      },
      orderBy: { dueDate: 'asc' },
    });

    if (!pendingPayment) {
      throw new BadRequestException('No pending payments found for this subscription');
    }

    // TODO: Integrate with NotificationsService to send notification
    // await this.notificationsService.sendPaymentReminder(pendingPayment, subscription);

    // Update payment notification count
    await this.prisma.payment.update({
      where: { id: pendingPayment.id },
      data: {
        notificationsSent: pendingPayment.notificationsSent + 1,
        lastNotificationSent: new Date(),
      },
    });

    return { 
      message: 'Payment notification sent successfully',
      paymentId: pendingPayment.id,
      notificationCount: pendingPayment.notificationsSent + 1,
    };
  }

  // Helper methods
  private mapSubscriptionToResponse(subscription: any): SubscriptionResponseDto {
    return {
      id: subscription.id,
      clientId: subscription.clientId,
      endUserId: subscription.endUserId,
      templateId: subscription.templateId,
      amount: Number(subscription.amount),
      status: subscription.status,
      nextDueDate: subscription.nextDueDate,
      lastPaidDate: subscription.lastPaidDate,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      customOverrides: subscription.customOverrides,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      endUser: subscription.endUser,
      template: subscription.template,
    };
  }

  private calculateNextDueDate(
    fromDate: Date,
    duration: number,
    unit: DurationUnit,
  ): Date {
    const nextDate = new Date(fromDate);

    switch (unit) {
      case DurationUnit.MINUTES:
        nextDate.setMinutes(nextDate.getMinutes() + duration);
        break;
      case DurationUnit.HOURS:
        nextDate.setHours(nextDate.getHours() + duration);
        break;
      case DurationUnit.DAYS:
        nextDate.setDate(nextDate.getDate() + duration);
        break;
      case DurationUnit.WEEKS:
        nextDate.setDate(nextDate.getDate() + (duration * 7));
        break;
      case DurationUnit.MONTHS:
        nextDate.setMonth(nextDate.getMonth() + duration);
        break;
      default:
        throw new Error(`Unsupported duration unit: ${unit}`);
    }

    return nextDate;
  }

  private async createPaymentForSubscription(subscription: any) {
    return this.prisma.payment.create({
      data: {
        clientId: subscription.clientId,
        endUserId: subscription.endUserId,
        subscriptionId: subscription.id,
        amount: subscription.amount,
        dueDate: subscription.nextDueDate,
        paymentMethod: subscription.template.paymentMethod,
        status: 'PENDING',
      },
    });
  }

  // Cron job method to create recurring payments
  async processRecurringPayments() {
    // This would be called by a scheduled job
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        nextDueDate: {
          lte: new Date(),
        },
      },
      include: {
        template: true,
      },
    });

    for (const subscription of activeSubscriptions) {
      // Check if payment already exists for this due date
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          subscriptionId: subscription.id,
          dueDate: subscription.nextDueDate,
        },
      });

      if (!existingPayment) {
        // Create new payment
        await this.createPaymentForSubscription(subscription);

        // Update next due date
        const nextDueDate = this.calculateNextDueDate(
          subscription.nextDueDate,
          subscription.template.recurringDuration,
          subscription.template.durationUnit,
        );

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { nextDueDate },
        });
      }
    }
  }
}
