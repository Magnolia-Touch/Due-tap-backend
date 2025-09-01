import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, PaginatedResponseDto, PaginationMetaDto } from '../common/dto/pagination.dto';
import {
  CreateEndUserDto,
  UpdateEndUserDto,
  EndUserResponseDto,
} from './dto/end-user.dto';

@Injectable()
export class EndUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getEndUsers(
    clientId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<EndUserResponseDto>> {
    const { page, limit, search } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      clientId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [endUsers, total] = await Promise.all([
      this.prisma.endUser.findMany({
        where,
        include: {
          _count: {
            select: {
              subscriptions: true,
              payments: true,
            },
          },
          payments: {
            where: { status: 'PAID' },
            select: { paidDate: true },
            orderBy: { paidDate: 'desc' },
            take: 1,
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.endUser.count({ where }),
    ]);

    const data = endUsers.map(endUser => ({
      id: endUser.id,
      name: endUser.name,
      email: endUser.email,
      phone: endUser.phone,
      status: endUser.status as any,
      metadata: endUser.metadata as Record<string, any>,
      createdAt: endUser.createdAt,
      updatedAt: endUser.updatedAt,
      subscriptionCount: endUser._count.subscriptions,
      totalPayments: endUser._count.payments,
      lastPaymentDate: endUser.payments[0]?.paidDate,
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

  async getEndUser(id: string, clientId: string): Promise<EndUserResponseDto> {
    const endUser = await this.prisma.endUser.findFirst({
      where: { id, clientId },
      include: {
        _count: {
          select: {
            subscriptions: true,
            payments: true,
          },
        },
        payments: {
          where: { status: 'PAID' },
          select: { paidDate: true },
          orderBy: { paidDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!endUser) {
      throw new NotFoundException('End user not found');
    }

    return {
      id: endUser.id,
      name: endUser.name,
      email: endUser.email,
      phone: endUser.phone,
      status: endUser.status as any,
      metadata: endUser.metadata as Record<string, any>,
      createdAt: endUser.createdAt,
      updatedAt: endUser.updatedAt,
      subscriptionCount: endUser._count.subscriptions,
      totalPayments: endUser._count.payments,
      lastPaymentDate: endUser.payments[0]?.paidDate,
    };
  }

  async createEndUser(
    clientId: string,
    createEndUserDto: CreateEndUserDto,
  ): Promise<EndUserResponseDto> {
    const { email, phone } = createEndUserDto;

    // Check for duplicate email within client
    if (email) {
      const existingUserByEmail = await this.prisma.endUser.findFirst({
        where: { clientId, email },
      });

      if (existingUserByEmail) {
        throw new ConflictException('End user with this email already exists');
      }
    }

    // Check for duplicate phone within client
    if (phone) {
      const existingUserByPhone = await this.prisma.endUser.findFirst({
        where: { clientId, phone },
      });

      if (existingUserByPhone) {
        throw new ConflictException('End user with this phone number already exists');
      }
    }

    const endUser = await this.prisma.endUser.create({
      data: {
        ...createEndUserDto,
        clientId,
      },
    });

    return {
      id: endUser.id,
      name: endUser.name,
      email: endUser.email,
      phone: endUser.phone,
      status: endUser.status as any,
      metadata: endUser.metadata as Record<string, any>,
      createdAt: endUser.createdAt,
      updatedAt: endUser.updatedAt,
      subscriptionCount: 0,
      totalPayments: 0,
    };
  }

  async updateEndUser(
    id: string,
    clientId: string,
    updateEndUserDto: UpdateEndUserDto,
  ): Promise<EndUserResponseDto> {
    const endUser = await this.prisma.endUser.findFirst({
      where: { id, clientId },
    });

    if (!endUser) {
      throw new NotFoundException('End user not found');
    }

    const { email, phone } = updateEndUserDto;

    // Check for duplicate email (excluding current user)
    if (email && email !== endUser.email) {
      const existingUserByEmail = await this.prisma.endUser.findFirst({
        where: { clientId, email, NOT: { id } },
      });

      if (existingUserByEmail) {
        throw new ConflictException('End user with this email already exists');
      }
    }

    // Check for duplicate phone (excluding current user)
    if (phone && phone !== endUser.phone) {
      const existingUserByPhone = await this.prisma.endUser.findFirst({
        where: { clientId, phone, NOT: { id } },
      });

      if (existingUserByPhone) {
        throw new ConflictException('End user with this phone number already exists');
      }
    }

    const updatedEndUser = await this.prisma.endUser.update({
      where: { id },
      data: updateEndUserDto,
    });

    return this.getEndUser(id, clientId);
  }

  async deleteEndUser(id: string, clientId: string) {
    const endUser = await this.prisma.endUser.findFirst({
      where: { id, clientId },
    });

    if (!endUser) {
      throw new NotFoundException('End user not found');
    }

    // Check if user has active subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { endUserId: id, status: 'ACTIVE' },
    });

    if (activeSubscriptions > 0) {
      throw new ForbiddenException(
        'Cannot delete end user with active subscriptions. Please cancel all subscriptions first.',
      );
    }

    await this.prisma.endUser.delete({
      where: { id },
    });

    return { message: 'End user deleted successfully' };
  }

  async getEndUserSubscriptions(id: string, clientId: string) {
    // Verify end user belongs to client
    const endUser = await this.prisma.endUser.findFirst({
      where: { id, clientId },
    });

    if (!endUser) {
      throw new NotFoundException('End user not found');
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: { endUserId: id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            title: true,
            paymentMethod: true,
            notificationMethod: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map(subscription => ({
      id: subscription.id,
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
      template: subscription.template,
      paymentCount: subscription._count.payments,
    }));
  }

  async getEndUserPayments(
    id: string,
    clientId: string,
    pagination: PaginationDto,
  ) {
    // Verify end user belongs to client
    const endUser = await this.prisma.endUser.findFirst({
      where: { id, clientId },
    });

    if (!endUser) {
      throw new NotFoundException('End user not found');
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { endUserId: id },
        include: {
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
      this.prisma.payment.count({ where: { endUserId: id } }),
    ]);

    const data = payments.map(payment => ({
      id: payment.id,
      subscriptionId: payment.subscriptionId,
      amount: Number(payment.amount),
      status: payment.status,
      dueDate: payment.dueDate,
      paidDate: payment.paidDate,
      paymentMethod: payment.paymentMethod,
      gatewayPaymentId: payment.gatewayPaymentId,
      notificationsSent: payment.notificationsSent,
      lastNotificationSent: payment.lastNotificationSent,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      subscription: {
        id: payment.subscription.id,
        templateId: payment.subscription.templateId,
        template: payment.subscription.template,
      },
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
}
