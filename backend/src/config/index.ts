import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:8081')
  .replace(/^['"]|['"]$/g, '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction) {
  const missing = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN', 'APP_URL'].filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required production environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: corsOrigins,
  },
  mail: {
    provider: (process.env.MAIL_PROVIDER || 'smtp').toLowerCase(),
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    from: (process.env.SMTP_FROM || process.env.SMTP_USER || 'CRM <no-reply@crm.local>').trim(),
    appUrl: process.env.APP_URL || 'http://localhost:5175',
    resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
  },
};
