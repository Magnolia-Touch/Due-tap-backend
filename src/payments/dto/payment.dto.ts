import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsUUID, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ description: 'End user ID' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  endUserId: string;

  @ApiProperty({ description: 'Subscription ID' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ description: 'Payment amount', example: 100.50 })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({ description: 'Due date' })
  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

  @ApiProperty({ 
    description: 'Payment method',
    enum: PaymentMethod 
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Gateway payment ID', required: false })
  @IsOptional()
  @IsString()
  gatewayPaymentId?: string;

  @ApiProperty({ description: 'Gateway response data', required: false })
  @IsOptional()
  gatewayResponse?: any;
}

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @ApiProperty({ 
    description: 'Payment status',
    enum: PaymentStatus,
    required: false 
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ description: 'Paid date', required: false })
  @IsOptional()
  @IsDateString()
  paidDate?: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  clientId: string;

  @ApiProperty()
  endUserId: string;

  @ApiProperty()
  subscriptionId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty({ required: false })
  paidDate?: Date;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiProperty({ required: false })
  gatewayPaymentId?: string;

  @ApiProperty({ required: false })
  gatewayResponse?: any;

  @ApiProperty()
  notificationsSent: number;

  @ApiProperty({ required: false })
  lastNotificationSent?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ description: 'End user details' })
  endUser?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };

  @ApiProperty({ description: 'Subscription details' })
  subscription?: {
    id: string;
    templateId: string;
    template: {
      id: string;
      name: string;
      title: string;
    };
  };
}

export class PaymentQueryDto {
  @ApiProperty({ description: 'Filter by status', required: false, enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ description: 'Filter by payment method', required: false, enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ description: 'Filter by subscription ID', required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  subscriptionId?: string;

  @ApiProperty({ description: 'Filter by end user ID', required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  endUserId?: string;

  @ApiProperty({ description: 'Filter by due date from', required: false })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiProperty({ description: 'Filter by due date to', required: false })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({ description: 'Search by end user name or email', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

export class MarkAsPaidDto {
  @ApiProperty({ description: 'Paid date', required: false })
  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @ApiProperty({ description: 'Gateway payment ID', required: false })
  @IsOptional()
  @IsString()
  gatewayPaymentId?: string;

  @ApiProperty({ description: 'Gateway response', required: false })
  @IsOptional()
  gatewayResponse?: any;
}

export class CreatePaymentLinkDto {
  @ApiProperty({ description: 'Payment ID' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  paymentId: string;

  @ApiProperty({ description: 'Success URL', required: false })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({ description: 'Cancel URL', required: false })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
