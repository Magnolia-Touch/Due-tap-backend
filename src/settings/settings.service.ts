import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import {
  UpdateSettingsDto,
  SettingsResponseDto,
  WhatsAppSettingsDto,
  EmailSettingsDto,
  RazorpaySettingsDto,
  StripeSettingsDto,
  TestSettingsDto,
} from './dto/settings.dto';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionUtil: EncryptionUtil,
  ) {}

  async getSettings(clientId: string): Promise<SettingsResponseDto> {
    let settings = await this.prisma.clientSettings.findUnique({
      where: { clientId },
    });

    // Create settings if they don't exist
    if (!settings) {
      settings = await this.prisma.clientSettings.create({
        data: { clientId },
      });
    }

    return {
      id: settings.id,
      clientId: settings.clientId,
      whatsappBusinessPhone: settings.whatsappBusinessPhone,
      emailSmtpHost: settings.emailSmtpHost,
      emailSmtpPort: settings.emailSmtpPort,
      emailSmtpUser: settings.emailSmtpUser,
      emailFromAddress: settings.emailFromAddress,
      razorpayKeyId: settings.razorpayKeyId,
      stripePublishableKey: settings.stripePublishableKey,
      hasWhatsappApiKey: !!settings.whatsappApiKey,
      hasEmailSmtpPassword: !!settings.emailSmtpPassword,
      hasRazorpayKeySecret: !!settings.razorpayKeySecret,
      hasStripeSecretKey: !!settings.stripeSecretKey,
      hasWebhookSecret: !!settings.webhookSecret,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async updateSettings(
    clientId: string,
    updateSettingsDto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    const encryptedData: any = {};

    // Encrypt sensitive fields
    if (updateSettingsDto.whatsappApiKey) {
      encryptedData.whatsappApiKey = this.encryptionUtil.encryptApiKey(updateSettingsDto.whatsappApiKey);
    }
    if (updateSettingsDto.emailSmtpPassword) {
      encryptedData.emailSmtpPassword = this.encryptionUtil.encryptApiKey(updateSettingsDto.emailSmtpPassword);
    }
    if (updateSettingsDto.razorpayKeySecret) {
      encryptedData.razorpayKeySecret = this.encryptionUtil.encryptApiKey(updateSettingsDto.razorpayKeySecret);
    }
    if (updateSettingsDto.stripeSecretKey) {
      encryptedData.stripeSecretKey = this.encryptionUtil.encryptApiKey(updateSettingsDto.stripeSecretKey);
    }
    if (updateSettingsDto.webhookSecret) {
      encryptedData.webhookSecret = this.encryptionUtil.encryptApiKey(updateSettingsDto.webhookSecret);
    }

    // Copy non-sensitive fields
    const nonSensitiveData = {
      ...(updateSettingsDto.whatsappBusinessPhone && { whatsappBusinessPhone: updateSettingsDto.whatsappBusinessPhone }),
      ...(updateSettingsDto.emailSmtpHost && { emailSmtpHost: updateSettingsDto.emailSmtpHost }),
      ...(updateSettingsDto.emailSmtpPort && { emailSmtpPort: updateSettingsDto.emailSmtpPort }),
      ...(updateSettingsDto.emailSmtpUser && { emailSmtpUser: updateSettingsDto.emailSmtpUser }),
      ...(updateSettingsDto.emailFromAddress && { emailFromAddress: updateSettingsDto.emailFromAddress }),
      ...(updateSettingsDto.razorpayKeyId && { razorpayKeyId: updateSettingsDto.razorpayKeyId }),
      ...(updateSettingsDto.stripePublishableKey && { stripePublishableKey: updateSettingsDto.stripePublishableKey }),
    };

    const settings = await this.prisma.clientSettings.upsert({
      where: { clientId },
      create: {
        clientId,
        ...encryptedData,
        ...nonSensitiveData,
      },
      update: {
        ...encryptedData,
        ...nonSensitiveData,
      },
    });

    return this.getSettings(clientId);
  }

  async updateWhatsAppSettings(
    clientId: string,
    whatsappSettings: WhatsAppSettingsDto,
  ) {
    const updateData: any = {};

    if (whatsappSettings.whatsappApiKey) {
      updateData.whatsappApiKey = this.encryptionUtil.encryptApiKey(whatsappSettings.whatsappApiKey);
    }
    if (whatsappSettings.whatsappBusinessPhone) {
      updateData.whatsappBusinessPhone = whatsappSettings.whatsappBusinessPhone;
    }

    await this.prisma.clientSettings.upsert({
      where: { clientId },
      create: { clientId, ...updateData },
      update: updateData,
    });

    return { message: 'WhatsApp settings updated successfully' };
  }

  async updateEmailSettings(
    clientId: string,
    emailSettings: EmailSettingsDto,
  ) {
    const updateData: any = {};

    // Copy non-sensitive fields
    if (emailSettings.emailSmtpHost) updateData.emailSmtpHost = emailSettings.emailSmtpHost;
    if (emailSettings.emailSmtpPort) updateData.emailSmtpPort = emailSettings.emailSmtpPort;
    if (emailSettings.emailSmtpUser) updateData.emailSmtpUser = emailSettings.emailSmtpUser;
    if (emailSettings.emailFromAddress) updateData.emailFromAddress = emailSettings.emailFromAddress;

    // Encrypt sensitive fields
    if (emailSettings.emailSmtpPassword) {
      updateData.emailSmtpPassword = this.encryptionUtil.encryptApiKey(emailSettings.emailSmtpPassword);
    }

    await this.prisma.clientSettings.upsert({
      where: { clientId },
      create: { clientId, ...updateData },
      update: updateData,
    });

    return { message: 'Email settings updated successfully' };
  }

  async updateRazorpaySettings(
    clientId: string,
    razorpaySettings: RazorpaySettingsDto,
  ) {
    const updateData: any = {};

    if (razorpaySettings.razorpayKeyId) {
      updateData.razorpayKeyId = razorpaySettings.razorpayKeyId;
    }
    if (razorpaySettings.razorpayKeySecret) {
      updateData.razorpayKeySecret = this.encryptionUtil.encryptApiKey(razorpaySettings.razorpayKeySecret);
    }

    await this.prisma.clientSettings.upsert({
      where: { clientId },
      create: { clientId, ...updateData },
      update: updateData,
    });

    return { message: 'Razorpay settings updated successfully' };
  }

  async updateStripeSettings(
    clientId: string,
    stripeSettings: StripeSettingsDto,
  ) {
    const updateData: any = {};

    if (stripeSettings.stripePublishableKey) {
      updateData.stripePublishableKey = stripeSettings.stripePublishableKey;
    }
    if (stripeSettings.stripeSecretKey) {
      updateData.stripeSecretKey = this.encryptionUtil.encryptApiKey(stripeSettings.stripeSecretKey);
    }

    await this.prisma.clientSettings.upsert({
      where: { clientId },
      create: { clientId, ...updateData },
      update: updateData,
    });

    return { message: 'Stripe settings updated successfully' };
  }

  async testSettings(clientId: string, testSettings: TestSettingsDto) {
    const settings = await this.prisma.clientSettings.findUnique({
      where: { clientId },
    });

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const { service, recipient } = testSettings;

    try {
      switch (service) {
        case 'whatsapp':
          return await this.testWhatsAppSettings(settings, recipient);
        case 'email':
          return await this.testEmailSettings(settings, recipient);
        case 'razorpay':
          return await this.testRazorpaySettings(settings);
        case 'stripe':
          return await this.testStripeSettings(settings);
        default:
          throw new BadRequestException('Invalid service type');
      }
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  // Helper methods for testing integrations
  private async testWhatsAppSettings(settings: any, recipient?: string) {
    if (!settings.whatsappApiKey) {
      throw new BadRequestException('WhatsApp API key not configured');
    }

    const apiKey = this.encryptionUtil.decryptApiKey(settings.whatsappApiKey);
    
    // Test WhatsApp API connection
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v17.0/me`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      );

      return {
        success: true,
        message: 'WhatsApp connection successful',
        data: {
          businessAccount: response.data.name || 'Connected',
          phone: settings.whatsappBusinessPhone,
        },
      };
    } catch (error) {
      throw new BadRequestException(`WhatsApp API test failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private async testEmailSettings(settings: any, recipient?: string) {
    if (!settings.emailSmtpHost || !settings.emailSmtpUser || !settings.emailSmtpPassword) {
      throw new BadRequestException('Email SMTP settings incomplete');
    }

    const password = this.encryptionUtil.decryptApiKey(settings.emailSmtpPassword);

    // Test SMTP connection
    const transporter = nodemailer.createTransport({
      host: settings.emailSmtpHost,
      port: settings.emailSmtpPort || 587,
      secure: settings.emailSmtpPort === 465,
      auth: {
        user: settings.emailSmtpUser,
        pass: password,
      },
    });

    try {
      await transporter.verify();

      // Send test email if recipient provided
      if (recipient) {
        await transporter.sendMail({
          from: settings.emailFromAddress || settings.emailSmtpUser,
          to: recipient,
          subject: 'Due-Tap Email Settings Test',
          text: 'This is a test email from Due-Tap to verify your email settings configuration.',
          html: '<p>This is a test email from <strong>Due-Tap</strong> to verify your email settings configuration.</p>',
        });

        return {
          success: true,
          message: 'Email settings test successful - test email sent',
          data: {
            host: settings.emailSmtpHost,
            port: settings.emailSmtpPort,
            user: settings.emailSmtpUser,
            testEmailSent: true,
            recipient,
          },
        };
      }

      return {
        success: true,
        message: 'Email SMTP connection successful',
        data: {
          host: settings.emailSmtpHost,
          port: settings.emailSmtpPort,
          user: settings.emailSmtpUser,
          connectionVerified: true,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Email test failed: ${error.message}`);
    }
  }

  private async testRazorpaySettings(settings: any) {
    if (!settings.razorpayKeyId || !settings.razorpayKeySecret) {
      throw new BadRequestException('Razorpay credentials not configured');
    }

    const keySecret = this.encryptionUtil.decryptApiKey(settings.razorpayKeySecret);
    const auth = Buffer.from(`${settings.razorpayKeyId}:${keySecret}`).toString('base64');

    try {
      const response = await axios.get(
        'https://api.razorpay.com/v1/accounts',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      return {
        success: true,
        message: 'Razorpay connection successful',
        data: {
          keyId: settings.razorpayKeyId,
          accountVerified: true,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Razorpay test failed: ${error.response?.data?.error?.description || error.message}`);
    }
  }

  private async testStripeSettings(settings: any) {
    if (!settings.stripeSecretKey) {
      throw new BadRequestException('Stripe secret key not configured');
    }

    const secretKey = this.encryptionUtil.decryptApiKey(settings.stripeSecretKey);

    try {
      const response = await axios.get(
        'https://api.stripe.com/v1/account',
        {
          headers: {
            'Authorization': `Bearer ${secretKey}`,
          },
        }
      );

      return {
        success: true,
        message: 'Stripe connection successful',
        data: {
          accountId: response.data.id,
          accountName: response.data.display_name || response.data.business_profile?.name,
          country: response.data.country,
          accountVerified: true,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Stripe test failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Helper methods for other services to get decrypted settings
  async getDecryptedWhatsAppSettings(clientId: string) {
    const settings = await this.prisma.clientSettings.findUnique({
      where: { clientId },
    });

    if (!settings?.whatsappApiKey) {
      throw new NotFoundException('WhatsApp settings not configured');
    }

    return {
      apiKey: this.encryptionUtil.decryptApiKey(settings.whatsappApiKey),
      businessPhone: settings.whatsappBusinessPhone,
    };
  }

  async getDecryptedEmailSettings(clientId: string) {
    const settings = await this.prisma.clientSettings.findUnique({
      where: { clientId },
    });

    if (!settings?.emailSmtpPassword) {
      throw new NotFoundException('Email settings not configured');
    }

    return {
      host: settings.emailSmtpHost,
      port: settings.emailSmtpPort,
      user: settings.emailSmtpUser,
      password: this.encryptionUtil.decryptApiKey(settings.emailSmtpPassword),
      fromAddress: settings.emailFromAddress,
    };
  }

  async getDecryptedRazorpaySettings(clientId: string) {
    const settings = await this.prisma.clientSettings.findUnique({
      where: { clientId },
    });

    if (!settings?.razorpayKeySecret) {
      throw new NotFoundException('Razorpay settings not configured');
    }

    return {
      keyId: settings.razorpayKeyId,
      keySecret: this.encryptionUtil.decryptApiKey(settings.razorpayKeySecret),
    };
  }

  async getDecryptedStripeSettings(clientId: string) {
    const settings = await this.prisma.clientSettings.findUnique({
      where: { clientId },
    });

    if (!settings?.stripeSecretKey) {
      throw new NotFoundException('Stripe settings not configured');
    }

    return {
      publishableKey: settings.stripePublishableKey,
      secretKey: this.encryptionUtil.decryptApiKey(settings.stripeSecretKey),
    };
  }
}
