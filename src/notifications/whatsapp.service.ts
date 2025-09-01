import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { TemplateProcessorUtil, TemplateVariables } from '../common/utils/template-processor.util';

export interface WhatsAppConfig {
  apiKey: string;
  businessPhone: string;
  apiUrl?: string;
}

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly defaultApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateProcessor: TemplateProcessorUtil,
  ) {
    this.defaultApiUrl = this.configService.get<string>('WHATSAPP_API_URL') || 'https://graph.facebook.com/v17.0';
  }

  /**
   * Send a text message via WhatsApp Business API
   */
  async sendTextMessage(
    config: WhatsAppConfig,
    to: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = this.cleanPhoneNumber(to);
      
      if (!this.isValidPhoneNumber(cleanPhone)) {
        throw new BadRequestException('Invalid phone number format');
      }

      const messageData: WhatsAppMessage = {
        to: cleanPhone,
        type: 'text',
        text: {
          body: message,
        },
      };

      const response: AxiosResponse = await axios.post(
        `${config.apiUrl || this.defaultApiUrl}/${config.businessPhone}/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`WhatsApp message sent successfully to ${cleanPhone}`);
      
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
      };

    } catch (error) {
      this.logger.error(`WhatsApp message failed for ${to}:`, error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Send a template-based message with dynamic variables
   */
  async sendTemplateMessage(
    config: WhatsAppConfig,
    to: string,
    templateContent: string,
    variables: TemplateVariables,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Process template with variables
      const processedMessage = this.templateProcessor.processTemplate(templateContent, variables);
      
      return await this.sendTextMessage(config, to, processedMessage);
    } catch (error) {
      this.logger.error(`WhatsApp template message failed for ${to}:`, error.message);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send payment reminder via WhatsApp
   */
  async sendPaymentReminder(
    config: WhatsAppConfig,
    endUser: { name: string; phone: string },
    payment: { amount: number; dueDate: Date; id: string },
    template: { title: string; body: string; name: string },
    businessName: string,
    paymentLink?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!endUser.phone) {
      throw new BadRequestException('End user phone number is required for WhatsApp notifications');
    }

    const variables: TemplateVariables = {
      name: endUser.name,
      amount: payment.amount,
      due_date: payment.dueDate,
      business_name: businessName,
      payment_link: paymentLink || '',
      customer_phone: endUser.phone,
      payment_id: payment.id,
      template_name: template.name,
      currency: '₹',
    };

    return await this.sendTemplateMessage(
      config,
      endUser.phone,
      template.body,
      variables,
    );
  }

  /**
   * Get message status from WhatsApp
   */
  async getMessageStatus(
    config: WhatsAppConfig,
    messageId: string,
  ): Promise<{ status: string; timestamp?: number }> {
    try {
      const response = await axios.get(
        `${config.apiUrl || this.defaultApiUrl}/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        }
      );

      return {
        status: response.data.status || 'unknown',
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      this.logger.error(`Failed to get WhatsApp message status for ${messageId}:`, error.response?.data || error.message);
      throw new BadRequestException('Failed to retrieve message status');
    }
  }

  /**
   * Validate WhatsApp API configuration
   */
  async validateConfig(config: WhatsAppConfig): Promise<boolean> {
    try {
      const response = await axios.get(
        `${config.apiUrl || this.defaultApiUrl}/me`,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        }
      );

      return !!response.data.id;
    } catch (error) {
      this.logger.error('WhatsApp config validation failed:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Clean and format phone number
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If starts with +, keep it; otherwise add country code
    if (!cleaned.startsWith('+')) {
      // Default to India country code if no + prefix
      cleaned = '+91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Basic validation: + followed by 10-15 digits
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Get webhook validation for incoming messages
   */
  validateWebhook(body: any, signature: string, webhookSecret: string): boolean {
    // Implement webhook signature validation
    const expectedSignature = this.calculateWebhookSignature(JSON.stringify(body), webhookSecret);
    return signature === expectedSignature;
  }

  private calculateWebhookSignature(payload: string, secret: string): string {
    // Implement the actual WhatsApp webhook signature calculation
    // This depends on WhatsApp's specific webhook signature algorithm
    return `sha256=${require('crypto').createHmac('sha256', secret).update(payload).digest('hex')}`;
  }
}
