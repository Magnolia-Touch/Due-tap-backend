import { IsOptional, IsDateString, IsString, IsEnum, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

export class AnalyticsQueryDto {
  @ApiProperty({ description: 'Start date for analytics', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date for analytics', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Filter by template ID', required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ description: 'Filter by payment method', required: false, enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ 
    description: 'Group by period', 
    required: false, 
    enum: ['day', 'week', 'month', 'year'],
    default: 'month'
  })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month' | 'year' = 'month';
}

export class PaymentAnalyticsDto {
  @ApiProperty({ description: 'Total payments' })
  totalPayments: number;

  @ApiProperty({ description: 'Total amount collected' })
  totalAmount: number;

  @ApiProperty({ description: 'Paid payments count' })
  paidPayments: number;

  @ApiProperty({ description: 'Pending payments count' })
  pendingPayments: number;

  @ApiProperty({ description: 'Failed payments count' })
  failedPayments: number;

  @ApiProperty({ description: 'Overdue payments count' })
  overduePayments: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ description: 'Average payment amount' })
  averageAmount: number;

  @ApiProperty({ description: 'Payment trends over time' })
  trends: Array<{
    period: string;
    totalPayments: number;
    totalAmount: number;
    paidCount: number;
    successRate: number;
  }>;

  @ApiProperty({ description: 'Payment distribution by status' })
  statusDistribution: Array<{
    status: PaymentStatus;
    count: number;
    amount: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Payment distribution by method' })
  methodDistribution: Array<{
    method: PaymentMethod;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

export class TemplateAnalyticsDto {
  @ApiProperty({ description: 'Template ID' })
  templateId: string;

  @ApiProperty({ description: 'Template name' })
  templateName: string;

  @ApiProperty({ description: 'Total subscriptions using this template' })
  totalSubscriptions: number;

  @ApiProperty({ description: 'Active subscriptions' })
  activeSubscriptions: number;

  @ApiProperty({ description: 'Total payments generated' })
  totalPayments: number;

  @ApiProperty({ description: 'Total amount collected' })
  totalAmount: number;

  @ApiProperty({ description: 'Success rate' })
  successRate: number;

  @ApiProperty({ description: 'Average payment amount' })
  averageAmount: number;

  @ApiProperty({ description: 'Total notifications sent' })
  notificationsSent: number;

  @ApiProperty({ description: 'Last used date' })
  lastUsed?: Date;
}

export class ClientAnalyticsDto {
  @ApiProperty({ description: 'Overview metrics' })
  overview: PaymentAnalyticsDto;

  @ApiProperty({ description: 'Template performance', type: [TemplateAnalyticsDto] })
  templatePerformance: TemplateAnalyticsDto[];

  @ApiProperty({ description: 'Top performing templates', type: [TemplateAnalyticsDto] })
  topTemplates: TemplateAnalyticsDto[];

  @ApiProperty({ description: 'Recent payment activity' })
  recentActivity: Array<{
    date: Date;
    type: 'payment_received' | 'payment_failed' | 'subscription_created' | 'notification_sent';
    description: string;
    amount?: number;
    endUserName?: string;
    templateName?: string;
  }>;

  @ApiProperty({ description: 'End user statistics' })
  endUserStats: {
    totalEndUsers: number;
    activeSubscriptions: number;
    totalPaymentsMade: number;
    averagePaymentValue: number;
  };

  @ApiProperty({ description: 'Monthly revenue trend' })
  monthlyRevenue: Array<{
    month: string;
    year: number;
    revenue: number;
    paymentCount: number;
    uniquePayors: number;
  }>;
}

export class SuperAdminAnalyticsDto {
  @ApiProperty({ description: 'Platform overview' })
  platformOverview: {
    totalClients: number;
    activeClients: number;
    totalRevenue: number;
    totalPayments: number;
    totalEndUsers: number;
    totalSubscriptions: number;
  };

  @ApiProperty({ description: 'Client growth over time' })
  clientGrowth: Array<{
    period: string;
    newClients: number;
    totalClients: number;
    activeClients: number;
  }>;

  @ApiProperty({ description: 'Revenue distribution by client' })
  revenueByClient: Array<{
    clientId: string;
    clientName: string;
    revenue: number;
    paymentCount: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Platform metrics over time' })
  platformTrends: Array<{
    period: string;
    totalRevenue: number;
    totalPayments: number;
    successRate: number;
    activeClients: number;
  }>;

  @ApiProperty({ description: 'Top performing clients', type: [Object] })
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalRevenue: number;
    totalPayments: number;
    successRate: number;
    endUserCount: number;
    subscriptionCount: number;
  }>;
}

export class NotificationAnalyticsDto {
  @ApiProperty({ description: 'Total notifications sent' })
  totalSent: number;

  @ApiProperty({ description: 'Notifications by method' })
  byMethod: Array<{
    method: 'WHATSAPP' | 'EMAIL';
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;

  @ApiProperty({ description: 'Notification trends over time' })
  trends: Array<{
    period: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;

  @ApiProperty({ description: 'Template-wise notification performance' })
  templatePerformance: Array<{
    templateId: string;
    templateName: string;
    notificationsSent: number;
    successRate: number;
    averageResponseTime: number;
  }>;
}
