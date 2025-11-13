import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationMethod, PaymentMethod, DurationUnit } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Monthly Subscription Reminder',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Message title',
    example: 'Payment Reminder',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Message body with dynamic variables like {{name}}, {{amount}}',
    example: 'Hi {{name}}, your payment of {{amount}} is due on {{due_date}}.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'Recurring duration number',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  recurringDuration: number;

  @ApiProperty({
    description: 'Duration unit',
    enum: DurationUnit,
    example: DurationUnit.MONTHS,
  })
  @IsEnum(DurationUnit)
  durationUnit: DurationUnit;

  @ApiProperty({
    description: 'Notification method',
    enum: NotificationMethod,
    example: NotificationMethod.BOTH,
  })
  @IsEnum(NotificationMethod)
  notificationMethod: NotificationMethod;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.RAZORPAY,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Default amount for this template',
    example: 99.99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  defaultAmount?: number;

  @ApiPropertyOptional({
    description: 'Whether template is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) { }

export class TemplateResponseDto {
  id: string;
  name: string;
  title: string;
  body: string;
  recurringDuration: number;
  durationUnit: DurationUnit;
  notificationMethod: NotificationMethod;
  paymentMethod: PaymentMethod;
  defaultAmount?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subscriptionCount?: number;
  totalRevenue?: number;
}
