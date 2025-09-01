import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/enums/user-roles.enum';
import { PaginationDto, PaginatedResponseDto, PaginationMetaDto } from '../common/dto/pagination.dto';
import { CreateClientDto, UpdateClientDto, DashboardStatsDto, ClientResponseDto } from './dto/client.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(): Promise<DashboardStatsDto> {
    const [totalClients, totalRevenue, newClientsLast30Days, recentSignups] = await Promise.all([
      this.prisma.client.count(),
      this.getTotalRevenue(),
      this.getNewClientsLast30Days(),
      this.getRecentSignups(),
    ]);

    const revenueOverTime = await this.getRevenueOverTime();
    const clientSignupsPerMonth = await this.getClientSignupsPerMonth();

    return {
      totalClients,
      totalRevenue,
      newClientsLast30Days,
      recentSignups,
      revenueOverTime,
      clientSignupsPerMonth,
    };
  }

  async getClients(pagination: PaginationDto): Promise<PaginatedResponseDto<ClientResponseDto>> {
    const { page, limit, search } = pagination;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' as const } } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
            { businessName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: {
          user: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    const data = clients.map(client => ({
      id: client.id,
      name: client.user.name,
      email: client.user.email,
      phone: client.user.phone,
      status: client.status,
      businessName: client.businessName,
      description: client.description,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
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

  async getClientDetails(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        user: true,
        endUsers: true,
        templates: true,
        subscriptions: {
          include: {
            endUser: true,
            template: true,
          },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            endUser: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const analytics = await this.getClientAnalytics(id);

    return {
      ...client,
      analytics,
    };
  }

  async createClient(createClientDto: CreateClientDto) {
    const { name, email, phone, password, businessName, description } = createClientDto;

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const client = await this.prisma.$transaction(async (tx) => {
      // Create user first
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: UserRole.CLIENT,
        },
      });

      // Create client profile
      const client = await tx.client.create({
        data: {
          userId: user.id,
          businessName,
          description,
        },
        include: {
          user: true,
        },
      });

      // Create default settings
      await tx.clientSettings.create({
        data: {
          clientId: client.id,
        },
      });

      return client;
    });

    const { user, ...clientData } = client;
    return {
      ...clientData,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
    };
  }

  async updateClient(id: string, updateClientDto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const { name, email, businessName, description, phone } = updateClientDto;

    const updatedClient = await this.prisma.$transaction(async (tx) => {
      // Update user if user fields are provided
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

      // Update client
      return tx.client.update({
        where: { id },
        data: {
          ...(businessName && { businessName }),
          ...(description && { description }),
        },
        include: { user: true },
      });
    });

    return updatedClient;
  }

  async toggleClientStatus(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const newStatus = client.status === 'active' ? 'inactive' : 'active';

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data: { status: newStatus },
      include: { user: true },
    });

    return updatedClient;
  }

  async deleteClient(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete client (cascade will handle related data)
      await tx.client.delete({
        where: { id },
      });

      // Delete associated user
      await tx.user.delete({
        where: { id: client.userId },
      });
    });

    return { message: 'Client deleted successfully' };
  }

  async getClientAnalytics(clientId: string) {
    const [totalUsers, totalPayments, activeSubscriptions, paymentStats] = await Promise.all([
      this.prisma.endUser.count({ where: { clientId } }),
      this.prisma.payment.aggregate({
        where: { clientId, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.subscription.count({ 
        where: { clientId, status: 'ACTIVE' } 
      }),
      this.getClientPaymentStats(clientId),
    ]);

    return {
      totalUsers,
      totalPaymentsCollected: totalPayments._sum.amount || 0,
      totalPaymentsCount: totalPayments._count,
      activeSubscriptions,
      paymentTrends: paymentStats,
    };
  }

  // Private helper methods
  private async getTotalRevenue(): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    });
    return Number(result._sum.amount) || 0;
  }

  private async getNewClientsLast30Days(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.client.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });
  }

  private async getRecentSignups(): Promise<ClientResponseDto[]> {
    const clients = await this.prisma.client.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return clients.map(client => ({
      id: client.id,
      name: client.user.name,
      email: client.user.email,
      phone: client.user.phone,
      status: client.status,
      businessName: client.businessName,
      description: client.description,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }));
  }

  private async getRevenueOverTime() {
    // Get revenue data for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'PAID',
        paidDate: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        amount: true,
        paidDate: true,
      },
    });

    // Group by month
    const revenueByMonth = new Map();
    payments.forEach(payment => {
      const month = payment.paidDate.toISOString().substring(0, 7); // YYYY-MM
      const current = revenueByMonth.get(month) || 0;
      revenueByMonth.set(month, current + Number(payment.amount));
    });

    return Array.from(revenueByMonth.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }

  private async getClientSignupsPerMonth() {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const clients = await this.prisma.client.findMany({
      where: {
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    const signupsByMonth = new Map();
    clients.forEach(client => {
      const month = client.createdAt.toISOString().substring(0, 7);
      const current = signupsByMonth.get(month) || 0;
      signupsByMonth.set(month, current + 1);
    });

    return Array.from(signupsByMonth.entries()).map(([month, signups]) => ({
      month,
      signups,
    }));
  }

  private async getClientPaymentStats(clientId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { clientId },
      select: {
        status: true,
        amount: true,
        createdAt: true,
      },
    });

    const stats = {
      total: payments.length,
      paid: payments.filter(p => p.status === 'PAID').length,
      pending: payments.filter(p => p.status === 'PENDING').length,
      failed: payments.filter(p => p.status === 'FAILED').length,
    };

    return stats;
  }
}
