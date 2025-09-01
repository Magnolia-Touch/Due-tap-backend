import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { TemplateProcessorUtil, TemplateVariables } from '../common/utils/template-processor.util';

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromAddress: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly templateProcessor: TemplateProcessorUtil,
  ) {}

  /**
   * Send a plain text email
   */
  async sendEmail(
    config: EmailConfig,
    message: EmailMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const transporter = this.createTransporter(config);
      
      const mailOptions = {
        from: config.fromAddress,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      
      this.logger.log(`Email sent successfully to ${message.to}, messageId: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
      };

    } catch (error) {
      this.logger.error(`Email failed for ${message.to}:`, error.message);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a template-based email with dynamic variables
   */
  async sendTemplateEmail(
    config: EmailConfig,
    to: string,
    subject: string,
    templateContent: string,
    variables: TemplateVariables,
    isHtml: boolean = false,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Process template with variables
      const processedContent = this.templateProcessor.processTemplate(templateContent, variables);
      const processedSubject = this.templateProcessor.processTemplate(subject, variables);
      
      const message: EmailMessage = {
        to,
        subject: processedSubject,
        [isHtml ? 'html' : 'text']: processedContent,
      };

      // If sending HTML, also include a text version
      if (isHtml) {
        message.text = this.convertHtmlToText(processedContent);
      }
      
      return await this.sendEmail(config, message);
    } catch (error) {
      this.logger.error(`Template email failed for ${to}:`, error.message);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send payment reminder via email
   */
  async sendPaymentReminder(
    config: EmailConfig,
    endUser: { name: string; email: string },
    payment: { amount: number; dueDate: Date; id: string },
    template: { title: string; body: string; name: string },
    businessName: string,
    paymentLink?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!endUser.email) {
      throw new BadRequestException('End user email is required for email notifications');
    }

    const variables: TemplateVariables = {
      name: endUser.name,
      amount: payment.amount,
      due_date: payment.dueDate,
      business_name: businessName,
      payment_link: paymentLink || '',
      customer_email: endUser.email,
      payment_id: payment.id,
      template_name: template.name,
      currency: '₹',
    };

    // Create HTML version of the email
    const htmlTemplate = this.createPaymentReminderHtml(template.body, variables);
    
    return await this.sendTemplateEmail(
      config,
      endUser.email,
      template.title,
      htmlTemplate,
      variables,
      true,
    );
  }

  /**
   * Send welcome email to new end user
   */
  async sendWelcomeEmail(
    config: EmailConfig,
    endUser: { name: string; email: string },
    businessName: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!endUser.email) {
      throw new BadRequestException('End user email is required');
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to ${businessName}!</h2>
        <p>Dear ${endUser.name},</p>
        <p>Welcome to our payment system. You will receive payment reminders and updates via this email address.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>${businessName} Team</p>
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">This email was sent by ${businessName} payment system.</p>
      </div>
    `;

    const message: EmailMessage = {
      to: endUser.email,
      subject: `Welcome to ${businessName}`,
      html: htmlContent,
      text: `Dear ${endUser.name},\n\nWelcome to ${businessName}! You will receive payment reminders and updates via this email address.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n${businessName} Team`,
    };

    return await this.sendEmail(config, message);
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    config: EmailConfig,
    endUser: { name: string; email: string },
    payment: { amount: number; paidDate: Date; id: string; gatewayPaymentId?: string },
    businessName: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!endUser.email) {
      throw new BadRequestException('End user email is required');
    }

    const formattedAmount = `₹${payment.amount.toFixed(2)}`;
    const formattedDate = payment.paidDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Payment Confirmed ✓</h2>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Dear ${endUser.name},</p>
          <p>We have successfully received your payment. Here are the details:</p>
          
          <table style="width: 100%; background-color: white; border-radius: 4px; padding: 20px; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formattedAmount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Payment Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Payment ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${payment.id}</td>
            </tr>
            ${payment.gatewayPaymentId ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Transaction ID:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${payment.gatewayPaymentId}</td>
            </tr>
            ` : ''}
          </table>
          
          <p>Thank you for your payment!</p>
          <p>Best regards,<br>${businessName} Team</p>
        </div>
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666; text-align: center;">This email was sent by ${businessName} payment system.</p>
      </div>
    `;

    const message: EmailMessage = {
      to: endUser.email,
      subject: `Payment Confirmation - ${formattedAmount}`,
      html: htmlContent,
      text: `Dear ${endUser.name},\n\nWe have successfully received your payment of ${formattedAmount} on ${formattedDate}.\n\nPayment ID: ${payment.id}${payment.gatewayPaymentId ? `\nTransaction ID: ${payment.gatewayPaymentId}` : ''}\n\nThank you for your payment!\n\nBest regards,\n${businessName} Team`,
    };

    return await this.sendEmail(config, message);
  }

  /**
   * Validate email configuration
   */
  async validateConfig(config: EmailConfig): Promise<boolean> {
    try {
      const transporter = this.createTransporter(config);
      await transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email config validation failed:', error.message);
      return false;
    }
  }

  /**
   * Create nodemailer transporter
   */
  private createTransporter(config: EmailConfig): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465, // true for 465, false for other ports
      auth: {
        user: config.user,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates in development
      },
    });
  }

  /**
   * Create HTML template for payment reminder
   */
  private createPaymentReminderHtml(templateBody: string, variables: TemplateVariables): string {
    const processedBody = this.templateProcessor.processTemplate(templateBody, variables);
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Payment Reminder</h2>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="white-space: pre-line; line-height: 1.6;">
            ${processedBody.replace(/\n/g, '<br>')}
          </div>
          
          ${variables.payment_link ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${variables.payment_link}" 
               style="background-color: #28a745; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 4px; display: inline-block; 
                      font-weight: bold;">
              Pay Now
            </a>
          </div>
          ` : ''}
        </div>
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666; text-align: center;">
          This email was sent by ${variables.business_name} payment system.
        </p>
      </div>
    `;
  }

  /**
   * Convert HTML to plain text
   */
  private convertHtmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }
}
