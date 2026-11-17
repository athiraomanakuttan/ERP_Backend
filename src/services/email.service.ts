import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface ResetPasswordEmailInput {
  to: string;
  firstName: string;
  resetUrl: string;
}

class EmailService {
  private isConfigured(): boolean {
    return Boolean(
      env.smtp.host &&
      env.smtp.port &&
      env.smtp.user &&
      env.smtp.pass &&
      env.emailFrom
    );
  }

  private createTransporter() {
    return nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }

  async sendPasswordResetEmail(input: ResetPasswordEmailInput): Promise<boolean> {
    if (!this.isConfigured()) {
      if (env.nodeEnv === 'development') {
        console.warn('[email] SMTP is not configured. Password reset link:');
        console.warn(input.resetUrl);
        return true;
      }

      console.error('[email] Password reset email not sent: SMTP is not configured.');
      return false;
    }

    try {
      const transporter = this.createTransporter();

      await transporter.sendMail({
        from: env.emailFrom,
        to: input.to,
        subject: 'Reset your EMS password',
        text: [
          `Hello ${input.firstName},`,
          '',
          'We received a request to reset the password for your EMS account.',
          `Reset your password: ${input.resetUrl}`,
          '',
          'This link expires in 1 hour and can be used only once.',
          'If you did not request a password reset, you can ignore this email.',
        ].join('\n'),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#172033;line-height:1.6">
            <h2 style="margin-bottom:8px">Reset your password</h2>
            <p>Hello ${escapeHtml(input.firstName)},</p>
            <p>We received a request to reset the password for your EMS account.</p>
            <p style="margin:28px 0">
              <a href="${escapeHtml(input.resetUrl)}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600">Reset password</a>
            </p>
            <p>This link expires in 1 hour and can be used only once.</p>
            <p>If you did not request a password reset, you can ignore this email.</p>
            <p style="font-size:12px;color:#667085;margin-top:32px">For security, never share this link with anyone.</p>
          </div>
        `,
      });

      return true;
    } catch (error) {
      console.error('[email] SMTP password-reset email failed:', error);
      return false;
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return map[char] ?? char;
  });
}

export const emailService = new EmailService();
