import * as CryptoJS from 'crypto-js';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EncryptionUtil {
  private readonly encryptionKey: string;

  constructor(private configService: ConfigService) {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text: string): string {
    if (!text) return null;
    
    try {
      const encrypted = CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) return null;
    
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
      const originalText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!originalText) {
        throw new Error('Failed to decrypt - invalid encrypted text or key');
      }
      
      return originalText;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash data (one-way)
   */
  hash(text: string): string {
    if (!text) return null;
    
    return CryptoJS.SHA256(text).toString();
  }

  /**
   * Generate a random encryption key
   */
  static generateKey(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  /**
   * Encrypt API keys specifically
   */
  encryptApiKey(apiKey: string): string {
    if (!apiKey) return null;
    return this.encrypt(apiKey);
  }

  /**
   * Decrypt API keys specifically
   */
  decryptApiKey(encryptedApiKey: string): string {
    if (!encryptedApiKey) return null;
    return this.decrypt(encryptedApiKey);
  }

  /**
   * Mask sensitive data for display
   */
  maskApiKey(apiKey: string, visibleChars: number = 4): string {
    if (!apiKey || apiKey.length <= visibleChars * 2) {
      return '****';
    }
    
    const start = apiKey.substring(0, visibleChars);
    const end = apiKey.substring(apiKey.length - visibleChars);
    const middle = '*'.repeat(Math.max(8, apiKey.length - visibleChars * 2));
    
    return `${start}${middle}${end}`;
  }

  /**
   * Validate if a string is properly encrypted
   */
  isEncrypted(text: string): boolean {
    if (!text) return false;
    
    try {
      // Try to decrypt - if it works, it's likely encrypted
      const decrypted = this.decrypt(text);
      return decrypted && decrypted !== text;
    } catch {
      return false;
    }
  }
}
