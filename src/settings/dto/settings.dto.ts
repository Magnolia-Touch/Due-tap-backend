import { IsOptional, IsString, IsNumber, IsEmail, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class WhatsAppSettingsDto {
  @ApiProperty({ description: 'WhatsApp API Key', required: false })
  @IsOptional()
  @IsString()
  whatsappApiKey?: string;

  @ApiProperty({ description: 'WhatsApp Business Phone Number', required: false })
  @IsOptional()
  @IsString()
  whatsappBusinessPhone?: string;
}

export class EmailSettingsDto {
  @ApiProperty({ description: 'SMTP Host', required: false })
  @IsOptional()
  @IsString()
  emailSmtpHost?: string;

  @ApiProperty({ description: 'SMTP Port', required: false, example: 587 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value))
  emailSmtpPort?: number;

  @ApiProperty({ description: 'SMTP User', required: false })
  @IsOptional()
  @IsString()
  emailSmtpUser?: string;

  @ApiProperty({ description: 'SMTP Password', required: false })
  @IsOptional()
  @IsString()
  emailSmtpPassword?: string;

  @ApiProperty({ description: 'From Email Address', required: false })
  @IsOptional()
  @IsEmail()
  emailFromAddress?: string;
}

export class RazorpaySettingsDto {
  @ApiProperty({ description: 'Razorpay Key ID', required: false })
  @IsOptional()
  @IsString()
  razorpayKeyId?: string;

  @ApiProperty({ description: 'Razorpay Key Secret', required: false })
  @IsOptional()
  @IsString()
  razorpayKeySecret?: string;
}

export class StripeSettingsDto {
  @ApiProperty({ description: 'Stripe Publishable Key', required: false })
  @IsOptional()
  @IsString()
  stripePublishableKey?: string;

  @ApiProperty({ description: 'Stripe Secret Key', required: false })
  @IsOptional()
  @IsString()
  stripeSecretKey?: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ description: 'WhatsApp API Key', required: false })
  @IsOptional()
  @IsString()
  whatsappApiKey?: string;

  @ApiProperty({ description: 'WhatsApp Business Phone Number', required: false })
  @IsOptional()
  @IsString()
  whatsappBusinessPhone?: string;

  @ApiProperty({ description: 'SMTP Host', required: false })
  @IsOptional()
  @IsString()
  emailSmtpHost?: string;

  @ApiProperty({ description: 'SMTP Port', required: false, example: 587 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value))
  emailSmtpPort?: number;

  @ApiProperty({ description: 'SMTP User', required: false })
  @IsOptional()
  @IsString()
  emailSmtpUser?: string;

  @ApiProperty({ description: 'SMTP Password', required: false })
  @IsOptional()
  @IsString()
  emailSmtpPassword?: string;

  @ApiProperty({ description: 'From Email Address', required: false })
  @IsOptional()
  @IsEmail()
  emailFromAddress?: string;

  @ApiProperty({ description: 'Razorpay Key ID', required: false })
  @IsOptional()
  @IsString()
  razorpayKeyId?: string;

  @ApiProperty({ description: 'Razorpay Key Secret', required: false })
  @IsOptional()
  @IsString()
  razorpayKeySecret?: string;

  @ApiProperty({ description: 'Stripe Publishable Key', required: false })
  @IsOptional()
  @IsString()
  stripePublishableKey?: string;

  @ApiProperty({ description: 'Stripe Secret Key', required: false })
  @IsOptional()
  @IsString()
  stripeSecretKey?: string;

  @ApiProperty({ description: 'Webhook Secret', required: false })
  @IsOptional()
  @IsString()
  webhookSecret?: string;
}

export class SettingsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  clientId: string;

  @ApiProperty({ description: 'WhatsApp Business Phone Number', required: false })
  whatsappBusinessPhone?: string;

  @ApiProperty({ description: 'SMTP Host', required: false })
  emailSmtpHost?: string;

  @ApiProperty({ description: 'SMTP Port', required: false })
  emailSmtpPort?: number;

  @ApiProperty({ description: 'SMTP User', required: false })
  emailSmtpUser?: string;

  @ApiProperty({ description: 'From Email Address', required: false })
  emailFromAddress?: string;

  @ApiProperty({ description: 'Razorpay Key ID', required: false })
  razorpayKeyId?: string;

  @ApiProperty({ description: 'Stripe Publishable Key', required: false })
  stripePublishableKey?: string;

  @ApiProperty({ description: 'Has WhatsApp API Key configured' })
  hasWhatsappApiKey: boolean;

  @ApiProperty({ description: 'Has Email SMTP Password configured' })
  hasEmailSmtpPassword: boolean;

  @ApiProperty({ description: 'Has Razorpay Key Secret configured' })
  hasRazorpayKeySecret: boolean;

  @ApiProperty({ description: 'Has Stripe Secret Key configured' })
  hasStripeSecretKey: boolean;

  @ApiProperty({ description: 'Has Webhook Secret configured' })
  hasWebhookSecret: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TestSettingsDto {
  @ApiProperty({ 
    description: 'Service to test', 
    enum: ['whatsapp', 'email', 'razorpay', 'stripe'] 
  })
  @IsString()
  service: 'whatsapp' | 'email' | 'razorpay' | 'stripe';

  @ApiProperty({ description: 'Test recipient (phone/email)', required: false })
  @IsOptional()
  @IsString()
  recipient?: string;
}
