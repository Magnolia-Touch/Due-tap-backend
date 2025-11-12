import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsUUID, Min, IsArray, ArrayNotEmpty, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'End user ID' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  endUserId: string;

  @ApiProperty({ description: 'Template ID' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  templateId: string;

  @ApiProperty({ description: 'Subscription amount', example: 100.50 })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({ description: 'Next due date' })
  @IsNotEmpty()
  @IsDateString()
  nextDueDate: string;

  @ApiProperty({ description: 'Start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Custom overrides for template settings', required: false })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  customOverrides: number[];
}

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
  @ApiProperty({
    description: 'Subscription status',
    enum: SubscriptionStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ description: 'Last paid date', required: false })
  @IsOptional()
  @IsDateString()
  lastPaidDate?: string;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  clientId: string;

  @ApiProperty()
  endUserId: string;

  @ApiProperty()
  templateId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  nextDueDate: Date;

  @ApiProperty({ required: false })
  lastPaidDate?: Date;

  @ApiProperty()
  startDate: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ required: false })
  customOverrides?: any;

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

  @ApiProperty({ description: 'Template details' })
  template?: {
    id: string;
    name: string;
    title: string;
  };
}

export class SubscriptionQueryDto {
  @ApiProperty({ description: 'Filter by status', required: false, enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ description: 'Filter by template ID', required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ description: 'Filter by end user ID', required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  endUserId?: string;

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
