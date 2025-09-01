import { Injectable } from '@nestjs/common';

export interface TemplateVariables {
  [key: string]: string | number | Date;
}

@Injectable()
export class TemplateProcessorUtil {
  /**
   * Process template by replacing variables with actual values
   */
  processTemplate(template: string, variables: TemplateVariables): string {
    let processed = template;
    
    // Replace variables in format {{variable}}
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = variables[key];
      
      // Convert value to string based on type
      let stringValue: string;
      if (value instanceof Date) {
        stringValue = value.toLocaleDateString('en-IN');
      } else if (typeof value === 'number') {
        stringValue = value.toString();
      } else {
        stringValue = String(value);
      }
      
      // Replace all occurrences
      processed = processed.replace(new RegExp(placeholder, 'g'), stringValue);
    });
    
    return processed;
  }

  /**
   * Extract variables from template
   */
  extractVariables(template: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(template)) !== null) {
      const variable = match[1];
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }
    
    return variables;
  }

  /**
   * Validate if all required variables are provided
   */
  validateVariables(template: string, variables: TemplateVariables): { valid: boolean; missing: string[] } {
    const requiredVariables = this.extractVariables(template);
    const providedVariables = Object.keys(variables);
    const missing = requiredVariables.filter(variable => !providedVariables.includes(variable));
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
}
