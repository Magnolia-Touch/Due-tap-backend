import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  MinLength,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    description: 'Client name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Client email address',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Client phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Client password',
    example: 'securePassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Business name',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiPropertyOptional({
    description: 'Business description',
    example: 'We provide excellent services',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @ApiPropertyOptional({
    description: 'Client name',
    example: 'John Doe Updated',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Business name',
    example: 'Updated Business Name',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  businessName?: string;
}

export class ClientResponseDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  businessName: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DashboardStatsDto {
  totalClients: number;
  totalRevenue: number;
  newClientsLast30Days: number;
  recentSignups: ClientResponseDto[];
  revenueOverTime: {
    date: string;
    revenue: number;
  }[];
  clientSignupsPerMonth: {
    month: string;
    signups: number;
  }[];
}
