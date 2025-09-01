import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { WhatsAppService } from './whatsapp.service';
import { EmailService } from './email.service';
import { NotificationMethod } from '@prisma/client';

export interface NotificationResult {
  success: boolean;
  method: 'whatsapp' | 'email';
  messageId?: string;
  error?: string;
}

export interface PaymentNotificationData {
  paymentId: string;
  subscriptionId: string;
  endUserId: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  templateId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly whatsappService: WhatsAppService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Send payment reminder notification
   */
  async sendPaymentReminder(
    paymentData: PaymentNotificationData,
    paymentLink?: string,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      // Get payment details with related data
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentData.paymentId },
        include: {
          endUser: true,
          subscription: {
            include: {
              template: true,
            },
          },
          client: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!payment) {
        throw new BadRequestException('Payment not found');
      }

      const { endUser, subscription, client } = payment;
      const template = subscription.template;
      const businessName = client.businessName;

      // Check notification method from template
      const notificationMethod = template.notificationMethod;

      // Send WhatsApp notification
      if (notificationMethod === NotificationMethod.WHATSAPP || notificationMethod === NotificationMethod.BOTH) {
        if (endUser.phone) {
          const whatsappResult = await this.sendWhatsAppNotification(
            paymentData.clientId,
            endUser,
            {
              amount: Number(payment.amount),
              dueDate: payment.dueDate,
              id: payment.id,
            },
            template,
            businessName,
            paymentLink,
          );
          results.push(whatsappResult);
        } else {
          results.push({
            success: false,
            method: 'whatsapp',
            error: 'End user phone number not available',
          });
        }
      }

      // Send Email notification
      if (notificationMethod === NotificationMethod.EMAIL || notificationMethod === NotificationMethod.BOTH) {
        if (endUser.email) {
          const emailResult = await this.sendEmailNotification(
            paymentData.clientId,
            endUser,
            {
              amount: Number(payment.amount),
              dueDate: payment.dueDate,
              id: payment.id,
            },
            template,
            businessName,
            paymentLink,
          );
          results.push(emailResult);
        } else {
          results.push({
            success: false,
            method: 'email',
            error: 'End user email address not available',
          });
        }
      }

      // Log notification attempts
      await this.logNotificationAttempts(paymentData, results);

      return results;
    } catch (error) {
      this.logger.error('Failed to send payment reminder:', error.message);
      throw error;
    }
  }

  /**
   * Send welcome notification to new end user
   */
  async sendWelcomeNotification(
    clientId: string,
    endUser: { id: string; name: string; email?: string; phone?: string },
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        throw new BadRequestException('Client not found');
      }

      // Send welcome email if email is available
      if (endUser.email) {
        try {
          const emailConfig = await this.settingsService.getDecryptedEmailSettings(clientId);
          const emailResult = await this.emailService.sendWelcomeEmail(
            emailConfig,
            { name: endUser.name, email: endUser.email },
            client.businessName,
          );
          
          results.push({
            success: emailResult.success,
            method: 'email',
            messageId: emailResult.messageId,
            error: emailResult.error,
          });
        } catch (error) {
          results.push({
            success: false,
            method: 'email',
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to send welcome notification:', error.message);
      throw error;
    }
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmation(
    paymentId: string,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          endUser: true,
          client: true,
        },
      });

      if (!payment || payment.status !== 'PAID') {
        throw new BadRequestException('Payment not found or not paid');
      }

      const { endUser, client } = payment;

      // Send confirmation email if email is available
      if (endUser.email) {
        try {
          const emailConfig = await this.settingsService.getDecryptedEmailSettings(client.id);
          const emailResult = await this.emailService.sendPaymentConfirmation(
            emailConfig,
            { name: endUser.name, email: endUser.email },
            {
              amount: Number(payment.amount),
              paidDate: payment.paidDate!,
              id: payment.id,
              gatewayPaymentId: payment.gatewayPaymentId,
            },
            client.businessName,
          );
          
          results.push({
            success: emailResult.success,
            method: 'email',
            messageId: emailResult.messageId,
            error: emailResult.error,
          });
        } catch (error) {
          results.push({
            success: false,
            method: 'email',
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to send payment confirmation:', error.message);
      throw error;
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(
    clientId: string,
    method: 'whatsapp' | 'email',
    recipient: string,
  ): Promise<NotificationResult> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        throw new BadRequestException('Client not found');
      }

      if (method === 'whatsapp') {
        const whatsappConfig = await this.settingsService.getDecryptedWhatsAppSettings(clientId);
        const result = await this.whatsappService.sendTextMessage(
          whatsappConfig,
          recipient,
          `Hello! This is a test message from ${client.businessName} using Due-Tap notification system. Your WhatsApp integration is working correctly! ✅`,
        );
        
        return {
          success: result.success,
          method: 'whatsapp',
          messageId: result.messageId,
          error: result.error,
        };
      } else if (method === 'email') {
        const emailConfig = await this.settingsService.getDecryptedEmailSettings(clientId);
        const result = await this.emailService.sendEmail(
          emailConfig,
          {
            to: recipient,
            subject: `Test Email from ${client.businessName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #28a745;">✅ Email Test Successful!</h2>
                <p>Hello!</p>
                <p>This is a test email from <strong>${client.businessName}</strong> using the Due-Tap notification system.</p>
                <p>Your email integration is working correctly!</p>
                <hr>
                <p style="font-size: 12px; color: #666;">Sent via Due-Tap Payment Reminder System</p>
              </div>
            `,
            text: `Hello!\n\nThis is a test email from ${client.businessName} using the Due-Tap notification system.\n\nYour email integration is working correctly!\n\nSent via Due-Tap Payment Reminder System`,
          },
        );
        
        return {
          success: result.success,
          method: 'email',
          messageId: result.messageId,
          error: result.error,
        };
      } else {
        throw new BadRequestException('Invalid notification method');
      }
    } catch (error) {
      this.logger.error('Failed to send test notification:', error.message);
      return {
        success: false,
        method,
        error: error.message,
      };
    }
  }

  // Private helper methods
  private async sendWhatsAppNotification(
    clientId: string,
    endUser: any,
    payment: any,
    template: any,
    businessName: string,
    paymentLink?: string,
  ): Promise<NotificationResult> {
    try {
      const whatsappConfig = await this.settingsService.getDecryptedWhatsAppSettings(clientId);
      const result = await this.whatsappService.sendPaymentReminder(
        whatsappConfig,
        { name: endUser.name, phone: endUser.phone },
        payment,
        template,
        businessName,
        paymentLink,
      );
      
      return {
        success: result.success,
        method: 'whatsapp',
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        method: 'whatsapp',
        error: error.message,
      };
    }
  }

  private async sendEmailNotification(
    clientId: string,
    endUser: any,
    payment: any,
    template: any,
    businessName: string,
    paymentLink?: string,
  ): Promise<NotificationResult> {
    try {
      const emailConfig = await this.settingsService.getDecryptedEmailSettings(clientId);
      const result = await this.emailService.sendPaymentReminder(
        emailConfig,
        { name: endUser.name, email: endUser.email },
        payment,
        template,
        businessName,
        paymentLink,
      );
      
      return {
        success: result.success,
        method: 'email',
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        method: 'email',
        error: error.message,
      };
    }
  }

  private async logNotificationAttempts(
    paymentData: PaymentNotificationData,
    results: NotificationResult[],
  ) {
    for (const result of results) {
      try {
        await this.prisma.notificationLog.create({
          data: {
            clientId: paymentData.clientId,
            endUserId: paymentData.endUserId,
            paymentId: paymentData.paymentId,
            method: result.method === 'whatsapp' ? 'WHATSAPP' : 'EMAIL',
            recipient: result.method === 'whatsapp' ? 'phone' : 'email', // This should be the actual recipient
            subject: `Payment Reminder - ₹${paymentData.amount}`,
            content: `Payment reminder for amount ₹${paymentData.amount} due on ${paymentData.dueDate.toLocaleDateString()}`,
            status: result.success ? 'sent' : 'failed',
            errorMessage: result.error,
          },
        });
      } catch (error) {
        this.logger.error('Failed to log notification attempt:', error.message);
      }
    }
  }
}
