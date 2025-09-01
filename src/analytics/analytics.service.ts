import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsQueryDto,
  PaymentAnalyticsDto,
  TemplateAnalyticsDto,
  ClientAnalyticsDto,
  SuperAdminAnalyticsDto,
  NotificationAnalyticsDto,
} from './dto/analytics.dto';
import { PaymentStatus, PaymentMethod, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPaymentAnalytics(clientId: string, query: AnalyticsQueryDto): Promise<PaymentAnalyticsDto> {
    const { startDate, endDate, templateId, paymentMethod, groupBy } = query;
    
    const whereClause: any = {
      clientId,
      ...(templateId && {
        subscription: {
          templateId,
        },
      }),
      ...(paymentMethod && { paymentMethod }),
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      },
    };

    // Get payment statistics
    const [totalPayments, paidPayments, pendingPayments, failedPayments] = await Promise.all([
      this.prisma.payment.count({ where: whereClause }),
      this.prisma.payment.count({ where: { ...whereClause, status: PaymentStatus.PAID } }),
      this.prisma.payment.count({ where: { ...whereClause, status: PaymentStatus.PENDING } }),
      this.prisma.payment.count({ where: { ...whereClause, status: PaymentStatus.FAILED } }),
    ]);

    // Get overdue payments (pending and past due date)
    const overduePayments = await this.prisma.payment.count({
      where: {
        ...whereClause,
        status: PaymentStatus.PENDING,
        dueDate: { lt: new Date() },
      },
    });

    // Get total amount and average
    const amountStats = await this.prisma.payment.aggregate({
      where: whereClause,
      _sum: { amount: true },
      _avg: { amount: true },
    });

    const totalAmount = Number(amountStats._sum.amount || 0);
    const averageAmount = Number(amountStats._avg.amount || 0);
    const successRate = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;

    // Get trends data
    const trends = await this.getPaymentTrends(clientId, query);

    // Get status distribution
    const statusDistribution = await this.getStatusDistribution(clientId, whereClause, totalPayments);

    // Get method distribution
    const methodDistribution = await this.getMethodDistribution(clientId, whereClause, totalPayments);

    return {
      totalPayments,
      totalAmount,
      paidPayments,
      pendingPayments,
      failedPayments,
      overduePayments,
      successRate,
      averageAmount,
      trends,
      statusDistribution,
      methodDistribution,
    };
  }

  async getTemplateAnalytics(clientId: string, query: AnalyticsQueryDto): Promise<TemplateAnalyticsDto[]> {
    const templates = await this.prisma.template.findMany({
      where: { clientId },
      include: {
        subscriptions: {
          include: {
            payments: true,
          },
        },
      },
    });

    return templates.map(template => {
      const totalSubscriptions = template.subscriptions.length;
      const activeSubscriptions = template.subscriptions.filter(
        sub => sub.status === SubscriptionStatus.ACTIVE
      ).length;

      const allPayments = template.subscriptions.flatMap(sub => sub.payments);
      const totalPayments = allPayments.length;
      const paidPayments = allPayments.filter(p => p.status === PaymentStatus.PAID).length;
      const totalAmount = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const successRate = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;
      const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;

      // Count notifications sent
      const notificationsSent = allPayments.reduce((sum, p) => sum + p.notificationsSent, 0);

      // Get last used date
      const lastUsed = template.subscriptions.length > 0 
        ? new Date(Math.max(...template.subscriptions.map(s => s.createdAt.getTime())))
        : undefined;

      return {
        templateId: template.id,
        templateName: template.name,
        totalSubscriptions,
        activeSubscriptions,
        totalPayments,
        totalAmount,
        successRate,
        averageAmount,
        notificationsSent,
        lastUsed,
      };
    });
  }

  async getClientAnalytics(clientId: string, query: AnalyticsQueryDto): Promise<ClientAnalyticsDto> {
    // Get overview
    const overview = await this.getPaymentAnalytics(clientId, query);

    // Get template performance
    const templatePerformance = await this.getTemplateAnalytics(clientId, query);

    // Get top templates (by revenue)
    const topTemplates = templatePerformance
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // Get recent activity
    const recentActivity = await this.getRecentActivity(clientId);

    // Get end user stats
    const endUserStats = await this.getEndUserStats(clientId);

    // Get monthly revenue
    const monthlyRevenue = await this.getMonthlyRevenue(clientId);

    return {
      overview,
      templatePerformance,
      topTemplates,
      recentActivity,
      endUserStats,
      monthlyRevenue,
    };
  }

  async getSuperAdminAnalytics(query: AnalyticsQueryDto): Promise<SuperAdminAnalyticsDto> {
    // Platform overview
    const [totalClients, totalRevenue, totalPayments, totalEndUsers, totalSubscriptions] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.payment.count(),
      this.prisma.endUser.count(),
      this.prisma.subscription.count(),
    ]);

    const activeClients = await this.prisma.client.count({
      where: {
        subscriptions: {
          some: {
            status: SubscriptionStatus.ACTIVE,
          },
        },
      },
    });

    const platformOverview = {
      totalClients,
      activeClients,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      totalPayments,
      totalEndUsers,
      totalSubscriptions,
    };

    // Get client growth, revenue by client, platform trends, and top clients
    const [clientGrowth, revenueByClient, platformTrends, topClients] = await Promise.all([
      this.getClientGrowth(),
      this.getRevenueByClient(),
      this.getPlatformTrends(),
      this.getTopClients(),
    ]);

    return {
      platformOverview,
      clientGrowth,
      revenueByClient,
      platformTrends,
      topClients,
    };
  }

  async getNotificationAnalytics(clientId: string, query: AnalyticsQueryDto): Promise<NotificationAnalyticsDto> {
    const whereClause: any = {
      clientId,
      ...(query.startDate || query.endDate) && {
        createdAt: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        },
      },
    };

    // Get total notifications from payments
    const payments = await this.prisma.payment.findMany({
      where: whereClause,
      include: {
        subscription: {
          include: {
            template: true,
          },
        },
      },
    });

    const totalSent = payments.reduce((sum, p) => sum + p.notificationsSent, 0);

    // Mock notification method distribution (would come from notification logs in real scenario)
    const byMethod = [
      {
        method: 'WHATSAPP' as const,
        sent: Math.floor(totalSent * 0.6),
        delivered: Math.floor(totalSent * 0.55),
        failed: Math.floor(totalSent * 0.05),
        deliveryRate: 91.7,
      },
      {
        method: 'EMAIL' as const,
        sent: Math.floor(totalSent * 0.4),
        delivered: Math.floor(totalSent * 0.38),
        failed: Math.floor(totalSent * 0.02),
        deliveryRate: 95.0,
      },
    ];

    // Mock trends (would be based on actual notification logs)
    const trends = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const sent = Math.floor(Math.random() * 100) + 20;
      return {
        period: date.toISOString().substr(0, 7),
        sent,
        delivered: Math.floor(sent * 0.92),
        failed: Math.floor(sent * 0.08),
      };
    }).reverse();

    // Template performance
    const templatePerformance = await this.getTemplateNotificationPerformance(clientId);

    return {
      totalSent,
      byMethod,
      trends,
      templatePerformance,
    };
  }

  // Private helper methods
  private async getPaymentTrends(clientId: string, query: AnalyticsQueryDto) {
    // This would be more sophisticated with actual date grouping in a real implementation
    const trends = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = date.toISOString().substr(0, 7); // YYYY-MM format
      
      return {
        period,
        totalPayments: Math.floor(Math.random() * 50) + 10,
        totalAmount: Math.floor(Math.random() * 50000) + 10000,
        paidCount: Math.floor(Math.random() * 40) + 5,
        successRate: Math.floor(Math.random() * 30) + 70,
      };
    }).reverse();

    return trends;
  }

  private async getStatusDistribution(clientId: string, whereClause: any, totalPayments: number) {
    const statuses = Object.values(PaymentStatus);
    const distribution = [];

    for (const status of statuses) {
      const count = await this.prisma.payment.count({
        where: { ...whereClause, status },
      });
      
      const amount = await this.prisma.payment.aggregate({
        where: { ...whereClause, status },
        _sum: { amount: true },
      });

      distribution.push({
        status,
        count,
        amount: Number(amount._sum.amount || 0),
        percentage: totalPayments > 0 ? (count / totalPayments) * 100 : 0,
      });
    }

    return distribution;
  }

  private async getMethodDistribution(clientId: string, whereClause: any, totalPayments: number) {
    const methods = Object.values(PaymentMethod);
    const distribution = [];

    for (const method of methods) {
      const count = await this.prisma.payment.count({
        where: { ...whereClause, paymentMethod: method },
      });
      
      const amount = await this.prisma.payment.aggregate({
        where: { ...whereClause, paymentMethod: method },
        _sum: { amount: true },
      });

      distribution.push({
        method,
        count,
        amount: Number(amount._sum.amount || 0),
        percentage: totalPayments > 0 ? (count / totalPayments) * 100 : 0,
      });
    }

    return distribution;
  }

  private async getRecentActivity(clientId: string) {
    // Mock recent activity data
    return [
      {
        date: new Date(),
        type: 'payment_received' as const,
        description: 'Payment received from John Doe',
        amount: 1500,
        endUserName: 'John Doe',
        templateName: 'Monthly Subscription',
      },
    ];
  }

  private async getEndUserStats(clientId: string) {
    const [totalEndUsers, activeSubscriptions, totalPayments, avgAmount] = await Promise.all([
      this.prisma.endUser.count({ where: { clientId } }),
      this.prisma.subscription.count({ 
        where: { clientId, status: SubscriptionStatus.ACTIVE } 
      }),
      this.prisma.payment.count({ where: { clientId } }),
      this.prisma.payment.aggregate({ 
        where: { clientId }, 
        _avg: { amount: true } 
      }),
    ]);

    return {
      totalEndUsers,
      activeSubscriptions,
      totalPaymentsMade: totalPayments,
      averagePaymentValue: Number(avgAmount._avg.amount || 0),
    };
  }

  private async getMonthlyRevenue(clientId: string) {
    // Mock monthly revenue data
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toLocaleString('default', { month: 'long' }),
        year: date.getFullYear(),
        revenue: Math.floor(Math.random() * 100000) + 20000,
        paymentCount: Math.floor(Math.random() * 200) + 50,
        uniquePayors: Math.floor(Math.random() * 100) + 25,
      };
    }).reverse();
  }

  private async getClientGrowth() {
    // Mock client growth data
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        period: date.toISOString().substr(0, 7),
        newClients: Math.floor(Math.random() * 10) + 1,
        totalClients: 50 + i * 5,
        activeClients: 40 + i * 4,
      };
    }).reverse();
  }

  private async getRevenueByClient() {
    // Get actual client revenue data
    const clients = await this.prisma.client.findMany({
      include: {
        payments: true,
      },
    });

    const totalRevenue = clients.reduce((sum, client) => 
      sum + client.payments.reduce((clientSum, payment) => 
        clientSum + Number(payment.amount), 0
      ), 0
    );

    return clients.map(client => {
      const revenue = client.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      return {
        clientId: client.id,
        clientName: client.businessName,
        revenue,
        paymentCount: client.payments.length,
        percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  private async getPlatformTrends() {
    // Mock platform trends
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        period: date.toISOString().substr(0, 7),
        totalRevenue: Math.floor(Math.random() * 500000) + 100000,
        totalPayments: Math.floor(Math.random() * 1000) + 200,
        successRate: Math.floor(Math.random() * 20) + 80,
        activeClients: Math.floor(Math.random() * 10) + 40,
      };
    }).reverse();
  }

  private async getTopClients() {
    const clients = await this.prisma.client.findMany({
      include: {
        payments: true,
        endUsers: true,
        subscriptions: true,
      },
    });

    return clients.map(client => {
      const totalRevenue = client.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const paidPayments = client.payments.filter(p => p.status === PaymentStatus.PAID).length;
      const successRate = client.payments.length > 0 ? (paidPayments / client.payments.length) * 100 : 0;

      return {
        clientId: client.id,
        clientName: client.businessName,
        totalRevenue,
        totalPayments: client.payments.length,
        successRate,
        endUserCount: client.endUsers.length,
        subscriptionCount: client.subscriptions.length,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
  }

  private async getTemplateNotificationPerformance(clientId: string) {
    const templates = await this.prisma.template.findMany({
      where: { clientId },
      include: {
        subscriptions: {
          include: {
            payments: true,
          },
        },
      },
    });

    return templates.map(template => {
      const allPayments = template.subscriptions.flatMap(sub => sub.payments);
      const notificationsSent = allPayments.reduce((sum, p) => sum + p.notificationsSent, 0);
      const successfulPayments = allPayments.filter(p => p.status === PaymentStatus.PAID).length;
      const successRate = allPayments.length > 0 ? (successfulPayments / allPayments.length) * 100 : 0;
      
      return {
        templateId: template.id,
        templateName: template.name,
        notificationsSent,
        successRate,
        averageResponseTime: Math.floor(Math.random() * 300) + 60, // Mock response time in seconds
      };
    });
  }
}
