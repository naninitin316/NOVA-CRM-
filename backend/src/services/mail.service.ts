import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Role } from '@prisma/client';

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  appUrl: string;
};

type WelcomeMailInput = {
  to: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  company?: string | null;
  department?: string | null;
  phone?: string | null;
};

type MailSendResult = {
  sent: boolean;
  skipped?: boolean;
  messageId?: string;
  response?: string;
  error?: string;
};

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  CONTRIBUTOR: 'Contributor',
  VIEWER: 'Viewer',
  SUPPORT: 'Support',
  SALES_TEAM: 'Sales Team',
  HR_TEAM: 'HR Team',
};

function clean(value?: string | null) {
  return value?.trim() || '';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseBoolean(value?: string) {
  if (!value) return undefined;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class MailService {
  private transporter?: Transporter;
  private transporterKey?: string;

  getConfig(): MailConfig {
    const host = clean(process.env.SMTP_HOST);
    const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
    const secureEnv = parseBoolean(process.env.SMTP_SECURE);
    const secure = port === 465 ? true : secureEnv ?? false;
    const user = clean(process.env.SMTP_USER);
    const pass = clean(process.env.SMTP_PASS).replace(/\s+/g, '');
    const from = clean(process.env.SMTP_FROM) || user || 'Nova CRM <no-reply@crm.local>';
    const appUrl = clean(process.env.APP_URL) || 'http://localhost:5175';

    return { host, port, secure, user, pass, from, appUrl };
  }

  getPublicStatus() {
    const config = this.getConfig();
    return {
      configured: this.isConfigured(config),
      host: config.host || null,
      port: config.port,
      secure: config.secure,
      user: config.user ? this.maskEmail(config.user) : null,
      from: config.from,
      appUrl: config.appUrl,
    };
  }

  isConfigured(config = this.getConfig()) {
    return Boolean(config.host && config.port && config.user && config.pass && config.from);
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split('@');
    if (!domain) return 'configured';
    return `${name.slice(0, 2)}***@${domain}`;
  }

  private getTransporter(config = this.getConfig()) {
    const key = `${config.host}:${config.port}:${config.secure}:${config.user}`;
    if (this.transporter && this.transporterKey === key) return this.transporter;

    const options: SMTPTransport.Options = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      connectionTimeout: 7000,
      greetingTimeout: 7000,
      socketTimeout: 9000,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        minVersion: 'TLSv1.2',
        servername: config.host,
      },
    };

    this.transporter = nodemailer.createTransport(options);
    this.transporterKey = key;
    return this.transporter;
  }

  async verify() {
    const config = this.getConfig();
    if (!this.isConfigured(config)) {
      throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
    }

    await this.getTransporter(config).verify();
    return this.getPublicStatus();
  }

  private renderWelcome(input: WelcomeMailInput) {
    const config = this.getConfig();
    const safeName = escapeHtml(input.name);
    const safeEmail = escapeHtml(input.email);
    const safePassword = escapeHtml(input.password);
    const safeCompany = escapeHtml(input.company || 'Your company');
    const safeDepartment = escapeHtml(input.department || 'Not assigned');
    const safePhone = escapeHtml(input.phone || 'Not provided');
    const safeRole = escapeHtml(ROLE_LABELS[input.role]);
    const safeAppUrl = escapeHtml(config.appUrl);

    const subject = `Welcome to Nova CRM, ${input.name}`;
    const text = [
      `Hello ${input.name},`,
      '',
      'Your Nova CRM account has been created successfully.',
      '',
      `Login URL: ${config.appUrl}`,
      `Email: ${input.email}`,
      `Temporary password: ${input.password}`,
      `Role: ${ROLE_LABELS[input.role]}`,
      `Company: ${input.company || 'Your company'}`,
      `Department: ${input.department || 'Not assigned'}`,
      `Phone: ${input.phone || 'Not provided'}`,
      '',
      'Please sign in and change your password after your first login.',
    ].join('\n');

    const html = `
      <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827">
        <div style="max-width:640px;margin:0 auto;padding:32px 18px">
          <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
            <div style="padding:26px 28px;background:#111827;color:#ffffff">
              <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#93c5fd">Nova CRM</div>
              <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25">Welcome, ${safeName}</h1>
            </div>
            <div style="padding:28px">
              <p style="margin:0 0 18px;line-height:1.6;color:#374151">Your account has been created successfully. Use the details below to sign in.</p>
              <table style="width:100%;border-collapse:collapse;margin:0 0 22px">
                <tbody>
                  ${this.renderRow('Login URL', `<a href="${safeAppUrl}" style="color:#2563eb">${safeAppUrl}</a>`)}
                  ${this.renderRow('Email', safeEmail)}
                  ${this.renderRow('Temporary password', safePassword)}
                  ${this.renderRow('Role', safeRole)}
                  ${this.renderRow('Company', safeCompany)}
                  ${this.renderRow('Department', safeDepartment)}
                  ${this.renderRow('Phone', safePhone)}
                </tbody>
              </table>
              <a href="${safeAppUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Open dashboard</a>
              <p style="margin:22px 0 0;color:#6b7280;font-size:13px;line-height:1.6">For security, please change your password after your first login.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    return { subject, text, html };
  }

  private renderRow(label: string, value: string) {
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:180px">${label}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:700;word-break:break-word">${value}</td>
      </tr>
    `;
  }

  async sendWelcomeEmail(input: WelcomeMailInput): Promise<MailSendResult> {
    const config = this.getConfig();
    if (!this.isConfigured(config)) {
      console.warn(`[Mail] Welcome email skipped for ${input.email}. SMTP is not configured.`);
      return { sent: false, skipped: true };
    }

    const { subject, text, html } = this.renderWelcome(input);
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const info = await this.getTransporter(config).sendMail({
          from: config.from,
          to: input.to,
          subject,
          text,
          html,
        });

        console.log(`[Mail] Welcome email sent to ${input.email} (${info.messageId || info.response || 'sent'})`);
        return { sent: true, messageId: info.messageId, response: info.response };
      } catch (error) {
        lastError = error;
        this.transporter = undefined;
        this.transporterKey = undefined;

        if (attempt < 2) {
          const message = error instanceof Error ? error.message : 'Unknown SMTP error';
          console.warn(`[Mail] Welcome email attempt ${attempt} failed for ${input.email}: ${message}. Retrying once.`);
          await delay(750);
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Welcome email could not be sent.');
  }

  async sendTestEmail(to: string) {
    return this.sendWelcomeEmail({
      to,
      name: 'Test User',
      email: to,
      password: 'temporary-password',
      role: Role.CONTRIBUTOR,
      company: 'Test Company',
      department: 'Sales',
      phone: '+91 00000 00000',
    });
  }
}

export const mailService = new MailService();
