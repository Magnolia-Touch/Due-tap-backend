import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum UserStatus {
  active = 'active',
  inactive = 'inactive',
  disabled = 'disabled',
}

export class CreateEndUserDto {
  @ApiProperty({
    description: 'End user name',
    example: 'John Customer',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'End user email',
    example: 'john.customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'End user phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Custom metadata for the user',
    example: { address: '123 Main St', customerId: 'CUST-001' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateEndUserDto extends PartialType(CreateEndUserDto) {
  @ApiPropertyOptional({
    description: 'User status',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class EndUserResponseDto {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: UserStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  subscriptionCount?: number;
  totalPayments?: number;
  lastPaymentDate?: Date;
}
