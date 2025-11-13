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
import { SubscriptionStatus, DurationUnit, PaymentMethod } from '@prisma/client';
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isBefore } from 'date-fns';
import { ClientsService } from 'src/clients/clients.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService,
    private readonly client: ClientsService
  ) { }

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

  private calculateNotificationDate(dueDate: Date, offset: number, unit: DurationUnit): Date {
    switch (unit) {
      case DurationUnit.DAYS:
        return offset < 0 ? subDays(dueDate, Math.abs(offset)) : addDays(dueDate, offset);
      case DurationUnit.WEEKS:
        return offset < 0 ? subWeeks(dueDate, Math.abs(offset)) : addWeeks(dueDate, offset);
      case DurationUnit.MONTHS:
        return offset < 0 ? subMonths(dueDate, Math.abs(offset)) : addMonths(dueDate, offset);
      default:
        throw new Error(`Unsupported duration unit: ${unit}`);
    }
  }

  private parseTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] ?? '');
  }
  async createSubscription(
    clientId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    console.log('Received DTO:', createSubscriptionDto);

    const {
      endUserId,
      templateId,
      amount,
      nextDueDate,
      startDate,
      endDate,
      customOverrides = [],
    } = createSubscriptionDto;
    console.log(createSubscriptionDto)
    // --- Input validation
    if (!templateId) throw new BadRequestException('templateId is required');
    if (!endUserId) throw new BadRequestException('endUserId is required');
    if (!nextDueDate) throw new BadRequestException('nextDueDate is required');
    if (isNaN(new Date(nextDueDate).getTime())) {
      throw new BadRequestException('Invalid nextDueDate format');
    }

    // --- Run all DB operations atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Validate EndUser
      const endUser = await tx.endUser.findFirst({
        where: { id: endUserId, clientId },
      });
      if (!endUser) throw new NotFoundException('End user not found');

      // 2️⃣ Validate Template
      const template = await tx.template.findFirst({
        where: { id: templateId },
      });
      if (!template) throw new NotFoundException('Template not found');
      if (!template.isActive) {
        throw new BadRequestException(
          'Cannot create subscription with inactive template',
        );
      }

      // 3️⃣ Check for existing active subscription
      const existingSubscription = await tx.subscription.findFirst({
        where: { endUserId, templateId, status: SubscriptionStatus.ACTIVE },
      });
      if (existingSubscription) {
        throw new BadRequestException('Active subscription already exists');
      }

      // 4️⃣ Create subscription
      const subscription = await tx.subscription.create({
        data: {
          clientId,
          endUserId,
          templateId,
          amount,
          nextDueDate: new Date(nextDueDate),
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          customOverrides,
          status: SubscriptionStatus.ACTIVE,
        },
        include: {
          endUser: true,
          template: true,
        },
      });

      // 🧾 4.1️⃣ Create a Razorpay payment link for this subscription
      const paymentPayload = {
        amount: Number(subscription.amount) * 100, // in paise if your amount is already multiplied
        currency: 'INR',
        description: `Subscription payment for ${subscription.template.name}`,
        customer_name: subscription.endUser.name,
        customer_email: subscription.endUser.email,
        customer_contact: subscription.endUser.phone || '9999999999', // fallback
      };
      let paymentLinkResult;
      if (template.paymentMethod == PaymentMethod.RAZORPAY) {
        paymentLinkResult = await this.client.generatePaymentLink(clientId, paymentPayload);
      }
      else if (template.paymentMethod == PaymentMethod.STRIPE) {
        paymentLinkResult = await this.client.generatePaymentLinkForSripe(clientId, paymentPayload);
      }

      // 5️⃣ Create payment record (⚠️ use tx instead of this.prisma)
      const payment = await this.createPaymentForSubscription(tx, subscription, paymentLinkResult.link);

      // 6️⃣ Prepare notification tasks
      const dueDate = new Date(nextDueDate);
      const tasks = [];

      for (const offset of customOverrides) {
        const notificationDate = this.calculateNotificationDate(
          dueDate,
          offset,
          template.durationUnit,
        );

        const isBeforeDue = notificationDate < dueDate;

        const messageTemplate = isBeforeDue
          ? 'Hi {{name}}, your payment of {{amount}} is due on {{due_date}}.'
          : 'Hi {{name}}, your payment of {{amount}} is past due on {{due_date}}.';

        const context = {
          name: endUser.name,
          amount,
          due_date: dueDate.toISOString().split('T')[0],
        };

        tasks.push({
          clientId,
          endUserId,
          templateId: template.id, // ✅ fixed key name
          templateName: this.parseTemplate(messageTemplate, context),
          templateTitle: this.parseTemplate(template.title, context),
          templateBody: this.parseTemplate(template.body, context),
          paymentLink: paymentLinkResult.link,
          notificationDate,
          notificationMethod: template.notificationMethod,
          paymentMethod: template.paymentMethod,
          subscriptionId: subscription.id, // ✅ fixed key name
          paymentId: payment.id,
          dueDate,
          amount,
        });

      }

      // 7️⃣ Save tasks (if any)
      if (tasks.length > 0) {
        await tx.task.createMany({ data: tasks });
      }

      // ✅ Return subscription response
      return this.mapSubscriptionToResponse(subscription);
    });

    return result;
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

  private async createPaymentForSubscription(
    tx: any, // ideally use: Prisma.TransactionClient
    subscription: any,
    link: string
  ) {
    return tx.payment.create({
      data: {
        clientId: subscription.clientId,
        endUserId: subscription.endUserId,
        subscriptionId: subscription.id, // ✅ correct FK column
        amount: subscription.amount,
        dueDate: subscription.nextDueDate,
        paymentMethod: subscription.template.paymentMethod,
        status: 'PENDING',
        paymentLink: link
      },
    });
  }

  // 🕒 Cron job method to create recurring payments
  async processRecurringPayments() {
    // Find all active subscriptions whose payment is due today or earlier
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

    console.log(
      `🔁 Found ${activeSubscriptions.length} active subscriptions to process.`,
    );

    for (const subscription of activeSubscriptions) {
      try {
        // 1️⃣ Check if payment already exists for this due date
        const existingPayment = await this.prisma.payment.findFirst({
          where: {
            subscriptionId: subscription.id,
            dueDate: subscription.nextDueDate,
          },
        });

        if (existingPayment) {
          console.log(
            `⚠️ Payment already exists for subscription ${subscription.id} on ${subscription.nextDueDate}`,
          );
          continue;
        }

        // 2️⃣ Ensure template is valid
        if (!subscription.template) {
          console.error(
            `❌ Missing template for subscription ${subscription.id}. Skipping.`,
          );
          continue;
        }

        // 3️⃣ Create new payment (using helper)
        const payment = await this.prisma.payment.create({
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

        console.log(
          `✅ Created payment ${payment.id} for subscription ${subscription.id}`,
        );

        // 4️⃣ Calculate next due date for next cycle
        const nextDueDate = this.calculateNextDueDate(
          subscription.nextDueDate,
          subscription.template.recurringDuration,
          subscription.template.durationUnit,
        );

        // 5️⃣ Update subscription with new due date
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { nextDueDate },
        });

        console.log(
          `🔄 Updated subscription ${subscription.id} → next due date: ${nextDueDate}`,
        );
      } catch (error) {
        console.error(
          `❌ Error processing subscription ${subscription.id}:`,
          error.message || error,
        );
      }
    }

    console.log('✅ Recurring payment processing completed.');
  }

}
