import { Injectable } from '@nestjs/common';

export interface TemplateVariables {
  name?: string;
  amount?: number | string;
  due_date?: Date | string;
  business_name?: string;
  payment_link?: string;
  customer_email?: string;
  customer_phone?: string;
  subscription_id?: string;
  payment_id?: string;
  template_name?: string;
  currency?: string;
  [key: string]: any; // Allow custom variables
}

@Injectable()
export class TemplateProcessorUtil {
  /**
   * Process template content by replacing variables with actual values
   */
  processTemplate(
    templateContent: string,
    variables: TemplateVariables,
  ): string {
    let processedContent = templateContent;

    // Replace all variables in the format {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        let replacementValue = String(value);

        // Special formatting for certain types
        if (key === 'amount' && typeof value === 'number') {
          replacementValue = this.formatAmount(value);
        } else if (key === 'due_date' && (value instanceof Date || typeof value === 'string')) {
          replacementValue = this.formatDate(value);
        }

        processedContent = processedContent.replace(regex, replacementValue);
      }
    });

    // Remove any remaining unprocessed variables
    processedContent = processedContent.replace(/{{[^}]*}}/g, '');

    return processedContent;
  }

  /**
   * Extract variable names from template content
   */
  extractVariables(templateContent: string): string[] {
    const regex = /{{([^}]+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(templateContent)) !== null) {
      const variableName = match[1].trim();
      if (!variables.includes(variableName)) {
        variables.push(variableName);
      }
    }

    return variables;
  }

  /**
   * Validate if all required variables are provided
   */
  validateTemplateVariables(
    templateContent: string,
    variables: TemplateVariables,
    requiredVariables: string[] = [],
  ): { isValid: boolean; missingVariables: string[] } {
    const extractedVariables = this.extractVariables(templateContent);
    const allRequiredVariables = [
      ...new Set([...extractedVariables, ...requiredVariables]),
    ];

    const missingVariables = allRequiredVariables.filter(
      (variable) =>
        variables[variable] === undefined || variables[variable] === null,
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }

  /**
   * Get available template variables with descriptions
   */
  getAvailableVariables(): { [key: string]: string } {
    return {
      name: 'Customer name',
      amount: 'Payment amount (formatted with currency)',
      due_date: 'Payment due date (formatted)',
      business_name: 'Your business name',
      payment_link: 'Payment link URL',
      customer_email: 'Customer email address',
      customer_phone: 'Customer phone number',
      subscription_id: 'Subscription ID',
      payment_id: 'Payment ID',
      template_name: 'Template name',
      currency: 'Currency symbol',
    };
  }

  /**
   * Create sample template content for testing
   */
  createSampleTemplate(): string {
    return `Hi {{name}},

This is a friendly reminder that your payment of {{amount}} for {{business_name}} is due on {{due_date}}.

Please make your payment using the link below:
{{payment_link}}

If you have any questions, please don't hesitate to contact us.

Thank you,
{{business_name}} Team`;
  }

  /**
   * Format amount with currency
   */
  private formatAmount(amount: number, currency: string = '₹'): string {
    return `${currency}${amount.toFixed(2)}`;
  }

  /**
   * Format date in a user-friendly way
   */
  private formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return String(date);
    }

    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Generate template preview with sample data
   */
  generatePreview(templateContent: string): string {
    const sampleVariables: TemplateVariables = {
      name: 'John Doe',
      amount: 999.99,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      business_name: 'Your Business Name',
      payment_link: 'https://pay.yourbusiness.com/payment/123',
      customer_email: 'john.doe@example.com',
      customer_phone: '+1234567890',
      subscription_id: 'SUB_123456',
      payment_id: 'PAY_789012',
      template_name: 'Monthly Payment Reminder',
      currency: '₹',
    };

    return this.processTemplate(templateContent, sampleVariables);
  }
}
