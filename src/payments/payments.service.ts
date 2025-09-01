import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto, PaginationMetaDto } from '../common/dto/pagination.dto';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentResponseDto,
  PaymentQueryDto,
  MarkAsPaidDto,
  CreatePaymentLinkDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayments(
    clientId: string,
    query: PaymentQueryDto,
  ): Promise<PaginatedResponseDto<PaymentResponseDto>> {
    const { page, limit, search, status, paymentMethod, subscriptionId, endUserId, dueDateFrom, dueDateTo } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      clientId,
      ...(status && { status }),
      ...(paymentMethod && { paymentMethod }),
      ...(subscriptionId && { subscriptionId }),
      ...(endUserId && { endUserId }),
      ...(dueDateFrom || dueDateTo) && {
        dueDate: {
          ...(dueDateFrom && { gte: new Date(dueDateFrom) }),
          ...(dueDateTo && { lte: new Date(dueDateTo) }),
        },
      },
      ...(search && {
        OR: [
          { endUser: { name: { contains: search, mode: 'insensitive' as const } } },
          { endUser: { email: { contains: search, mode: 'insensitive' as const } } },
          { gatewayPaymentId: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
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
          subscription: {
            include: {
              template: {
                select: {
                  id: true,
                  name: true,
                  title: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const data = payments.map(payment => ({
      id: payment.id,
      clientId: payment.clientId,
      endUserId: payment.endUserId,
      subscriptionId: payment.subscriptionId,
      amount: Number(payment.amount),
      status: payment.status,
      dueDate: payment.dueDate,
      paidDate: payment.paidDate,
      paymentMethod: payment.paymentMethod,
      gatewayPaymentId: payment.gatewayPaymentId,
      gatewayResponse: payment.gatewayResponse,
      notificationsSent: payment.notificationsSent,
      lastNotificationSent: payment.lastNotificationSent,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      endUser: payment.endUser,
      subscription: payment.subscription,
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

  async getPayment(id: string, clientId: string): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
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
        subscription: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      id: payment.id,
      clientId: payment.clientId,
      endUserId: payment.endUserId,
      subscriptionId: payment.subscriptionId,
      amount: Number(payment.amount),
      status: payment.status,
      dueDate: payment.dueDate,
      paidDate: payment.paidDate,
      paymentMethod: payment.paymentMethod,
      gatewayPaymentId: payment.gatewayPaymentId,
      gatewayResponse: payment.gatewayResponse,
      notificationsSent: payment.notificationsSent,
      lastNotificationSent: payment.lastNotificationSent,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      endUser: payment.endUser,
      subscription: payment.subscription,
    };
  }

  async createPayment(clientId: string, createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    // Verify end user belongs to client
    const endUser = await this.prisma.endUser.findFirst({
      where: { id: createPaymentDto.endUserId, clientId },
    });

    if (!endUser) {
      throw new NotFoundException('End user not found');
    }

    // Verify subscription belongs to client
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: createPaymentDto.subscriptionId, clientId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const payment = await this.prisma.payment.create({
      data: {
        clientId,
        ...createPaymentDto,
        amount: createPaymentDto.amount,
        dueDate: new Date(createPaymentDto.dueDate),
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
        subscription: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return this.mapPaymentToResponse(payment);
  }

  async updatePayment(
    id: string,
    clientId: string,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id, clientId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        ...updatePaymentDto,
        ...(updatePaymentDto.dueDate && { dueDate: new Date(updatePaymentDto.dueDate) }),
        ...(updatePaymentDto.paidDate && { paidDate: new Date(updatePaymentDto.paidDate) }),
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
        subscription: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return this.mapPaymentToResponse(updatedPayment);
  }

  async markAsPaid(id: string, clientId: string, markAsPaidDto: MarkAsPaidDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, clientId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'PAID') {
      throw new BadRequestException('Payment is already marked as paid');
    }

    await this.prisma.payment.update({
      where: { id },
      data: {
        status: 'PAID',
        paidDate: markAsPaidDto.paidDate ? new Date(markAsPaidDto.paidDate) : new Date(),
        ...(markAsPaidDto.gatewayPaymentId && { gatewayPaymentId: markAsPaidDto.gatewayPaymentId }),
        ...(markAsPaidDto.gatewayResponse && { gatewayResponse: markAsPaidDto.gatewayResponse }),
      },
    });

    return { message: 'Payment marked as paid successfully' };
  }

  async resendNotification(id: string, clientId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, clientId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Can only resend notifications for pending payments');
    }

    // Update notification count
    await this.prisma.payment.update({
      where: { id },
      data: {
        notificationsSent: payment.notificationsSent + 1,
        lastNotificationSent: new Date(),
      },
    });

    // TODO: Integrate with NotificationsService to actually send notification

    return {
      message: 'Payment notification sent successfully',
      notificationCount: payment.notificationsSent + 1,
    };
  }

  async createPaymentLink(id: string, clientId: string, createPaymentLinkDto: CreatePaymentLinkDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, clientId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // TODO: Implement payment gateway integration
    return {
      message: 'Payment link created successfully (placeholder)',
      paymentLink: `https://example.com/pay/${payment.id}`,
    };
  }

  async handleRazorpayWebhook(body: any, signature: string) {
    // TODO: Implement Razorpay webhook handling
    return { received: true };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    // TODO: Implement Stripe webhook handling
    return { received: true };
  }

  // Helper method
  private mapPaymentToResponse(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      clientId: payment.clientId,
      endUserId: payment.endUserId,
      subscriptionId: payment.subscriptionId,
      amount: Number(payment.amount),
      status: payment.status,
      dueDate: payment.dueDate,
      paidDate: payment.paidDate,
      paymentMethod: payment.paymentMethod,
      gatewayPaymentId: payment.gatewayPaymentId,
      gatewayResponse: payment.gatewayResponse,
      notificationsSent: payment.notificationsSent,
      lastNotificationSent: payment.lastNotificationSent,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      endUser: payment.endUser,
      subscription: payment.subscription,
    };
  }
}
