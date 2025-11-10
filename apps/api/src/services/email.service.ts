/**
 * Email Service
 *
 * Handles email sending via Nodemailer with SMTP configuration.
 * Supports local email testing with Mailpit during development.
 *
 * Features:
 * - Single and bulk email sending
 * - HTML email templates support
 * - Admin notification helper
 * - Graceful error handling
 * - Environment-based configuration
 */

import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Email sending options
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

/**
 * Template variables for email rendering
 */
export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined;
}

/**
 * EmailService
 *
 * Singleton service for sending emails via Nodemailer
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the email service with SMTP configuration
   */
  private initialize(): void {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
      SMTP_FROM_NAME,
      ENABLE_EMAIL_NOTIFICATIONS,
    } = process.env;

    // Check if email notifications are enabled
    if (ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
      console.log('📧 Email notifications are disabled (ENABLE_EMAIL_NOTIFICATIONS=false)');
      return;
    }

    // Validate required configuration
    if (!SMTP_HOST) {
      console.warn('⚠️  Email service not configured. Missing SMTP_HOST');
      return;
    }

    try {
      // Build transporter config
      const transportConfig: any = {
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '2525', 10),
        secure: SMTP_SECURE === 'true',
        // For local development, disable certificate validation
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      };

      // Only add auth if credentials are provided (not needed for Mailpit)
      if (SMTP_USER || SMTP_PASS) {
        transportConfig.auth = {
          user: SMTP_USER,
          pass: SMTP_PASS,
        };
      }

      this.transporter = nodemailer.createTransport(transportConfig);

      // Set default from address
      this.transporter.options.from = SMTP_FROM_NAME
        ? `${SMTP_FROM_NAME} <${SMTP_FROM}>`
        : SMTP_FROM;

      this.isConfigured = true;
      console.log(`✅ Email service initialized with ${SMTP_HOST}`);
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  /**
   * Check if email service is configured and ready
   */
  public isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Send an email
   *
   * @param options - Email options including recipient, subject, and content
   * @returns Promise<boolean> - True if sent successfully, false otherwise
   */
  public async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('⚠️  Email service not configured. Email not sent.');
      return false;
    }

    try {
      const info = await this.transporter!.sendMail({
        from: options.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });

      console.log('📧 Email sent successfully:', {
        messageId: info.messageId,
        recipients: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send bulk emails to multiple recipients
   *
   * @param recipients - Array of recipient email addresses
   * @param subject - Email subject
   * @param html - HTML email content
   * @param text - Plain text email content (optional)
   * @returns Promise<number> - Number of successfully sent emails
   */
  public async sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<number> {
    if (!this.isReady()) {
      console.warn('⚠️  Email service not configured. Bulk emails not sent.');
      return 0;
    }

    let successCount = 0;

    for (const recipient of recipients) {
      const success = await this.sendEmail({
        to: recipient,
        subject,
        html,
        text,
      });

      if (success) {
        successCount++;
      }
    }

    console.log(`📧 Bulk email complete: ${successCount}/${recipients.length} sent successfully`);
    return successCount;
  }

  /**
   * Send notification email to all admin users
   *
   * @param subject - Email subject
   * @param html - HTML email content
   * @param text - Plain text email content (optional)
   * @returns Promise<boolean> - True if sent successfully to at least one admin
   */
  public async sendAdminNotification(
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS;

    if (!adminEmails) {
      console.warn('⚠️  ADMIN_NOTIFICATION_EMAILS not configured. Admin notification not sent.');
      return false;
    }

    const recipients = adminEmails.split(',').map((email) => email.trim());

    if (recipients.length === 0) {
      console.warn('⚠️  No admin emails configured. Admin notification not sent.');
      return false;
    }

    console.log(`📧 Sending admin notification to ${recipients.length} admin(s)...`);

    const successCount = await this.sendBulkEmail(recipients, subject, html, text);
    return successCount > 0;
  }

  /**
   * Load and render an email template
   *
   * @param templateName - Name of the template file (without .html extension)
   * @param variables - Variables to replace in the template
   * @returns string - Rendered HTML
   */
  public async renderTemplate(templateName: string, variables: TemplateVariables): Promise<string> {
    const templatePath = path.join(__dirname, '..', 'templates', 'email', `${templateName}.html`);

    try {
      let html = fs.readFileSync(templatePath, 'utf-8');

      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, String(value ?? ''));
      }

      return html;
    } catch (error) {
      console.error(`❌ Failed to load template "${templateName}":`, error);
      throw new Error(`Template "${templateName}" not found`);
    }
  }

  /**
   * Verify SMTP connection
   *
   * @returns Promise<boolean> - True if connection is successful
   */
  public async verifyConnection(): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('⚠️  Email service not configured. Cannot verify connection.');
      return false;
    }

    try {
      await this.transporter!.verify();
      console.log('✅ SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection verification failed:', error);
      return false;
    }
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

/**
 * Get EmailService singleton instance
 *
 * @returns EmailService instance
 */
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}
