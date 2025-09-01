import { ApiProperty } from '@nestjs/swagger';

export class ClientDashboardStatsDto {
  @ApiProperty({ description: 'Total payments collected' })
  totalPaymentsCollected: number;

  @ApiProperty({ description: 'Active users count' })
  activeUsers: number;

  @ApiProperty({ description: 'Active subscriptions count' })
  activeSubscriptions: number;

  @ApiProperty({ description: 'Payment collection trends' })
  paymentTrends: {
    date: string;
    amount: number;
  }[];

  @ApiProperty({ description: 'Payment status distribution' })
  paymentDistribution: {
    paid: number;
    pending: number;
    failed: number;
    overdue: number;
  };

  @ApiProperty({ description: 'Recent successful payments' })
  recentPayments: {
    id: string;
    amount: number;
    endUserName: string;
    paidDate: Date;
  }[];
}
