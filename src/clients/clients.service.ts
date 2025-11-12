import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientDashboardStatsDto } from './dto/dashboard.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) { }

  async getClientIdFromUser(userId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      throw new ForbiddenException('User is not associated with a client');
    }

    return client.id;
  }

  async getDashboardData(clientId: string): Promise<ClientDashboardStatsDto> {
    console.log("000000000000000")
    const client = await this.prisma.client.findUnique({
      where: { id: clientId }
    })
    if (!client.id) {
      throw new ForbiddenException("User Not found")
    }
    console.log("000000000000000")
    const [
      totalPayments,
      activeUsers,
      activeSubscriptions,
      paymentTrends,
      paymentDistribution,
      recentPayments,
    ] = await Promise.all([
      this.getTotalPaymentsCollected(clientId),
      this.getActiveUsersCount(clientId),
      this.getActiveSubscriptionsCount(clientId),
      this.getPaymentTrends(clientId),
      this.getPaymentDistribution(clientId),
      this.getRecentPayments(clientId),
    ]);

    return {
      totalPaymentsCollected: totalPayments,
      activeUsers,
      activeSubscriptions,
      paymentTrends,
      paymentDistribution,
      recentPayments,
    };
  }

  async getClientProfile(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePicture: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        settings: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async updateClientProfile(clientId: string, updateData: any) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const { name, email, phone, businessName, description } = updateData;

    const updatedClient = await this.prisma.$transaction(async (tx) => {
      // Update user fields
      if (name || email || phone) {
        await tx.user.update({
          where: { id: client.userId },
          data: {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone }),
          },
        });
      }

      // Update client fields
      return tx.client.update({
        where: { id: clientId },
        data: {
          ...(businessName && { businessName }),
          ...(description && { description }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profilePicture: true,
            },
          },
        },
      });
    });

    return updatedClient;
  }

  // Private helper methods
  private async getTotalPaymentsCollected(clientId: string): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { clientId, status: 'PAID' },
      _sum: { amount: true },
    });
    return Number(result._sum.amount) || 0;
  }

  private async getActiveUsersCount(clientId: string): Promise<number> {
    return this.prisma.endUser.count({
      where: { clientId, status: 'active' },
    });
  }

  private async getActiveSubscriptionsCount(clientId: string): Promise<number> {
    return this.prisma.subscription.count({
      where: { clientId, status: 'ACTIVE' },
    });
  }

  private async getPaymentTrends(clientId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const payments = await this.prisma.payment.findMany({
      where: {
        clientId,
        status: 'PAID',
        paidDate: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        amount: true,
        paidDate: true,
      },
    });

    const trendsByMonth = new Map();
    payments.forEach(payment => {
      const month = payment.paidDate.toISOString().substring(0, 7);
      const current = trendsByMonth.get(month) || 0;
      trendsByMonth.set(month, current + Number(payment.amount));
    });

    return Array.from(trendsByMonth.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));
  }

  private async getPaymentDistribution(clientId: string) {
    const payments = await this.prisma.payment.groupBy({
      by: ['status'],
      where: { clientId },
      _count: { status: true },
    });

    const distribution = {
      paid: 0,
      pending: 0,
      failed: 0,
      overdue: 0,
    };

    payments.forEach(item => {
      switch (item.status) {
        case 'PAID':
          distribution.paid = item._count.status;
          break;
        case 'PENDING':
          distribution.pending = item._count.status;
          break;
        case 'FAILED':
          distribution.failed = item._count.status;
          break;
        case 'OVERDUE':
          distribution.overdue = item._count.status;
          break;
      }
    });

    return distribution;
  }

  private async getRecentPayments(clientId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { clientId, status: 'PAID' },
      include: {
        endUser: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { paidDate: 'desc' },
      take: 5,
    });

    return payments.map(payment => ({
      id: payment.id,
      amount: Number(payment.amount),
      endUserName: payment.endUser.name,
      paidDate: payment.paidDate,
    }));
  }
}
