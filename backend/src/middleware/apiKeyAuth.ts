import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from '../utils/errorHandler';

/**
 * Middleware that validates incoming API key against CRM_LEADS_API_KEY.
 * Supports both:
 * - Authorization: Bearer <API_KEY>
 * - X-API-Key: <API_KEY>
 */
export const apiKeyAuth = (req: Request, _res: Response, next: NextFunction) => {
  const configuredKey = process.env.CRM_LEADS_API_KEY;

  if (!configuredKey) {
    return next(new AppError('API key authentication is not configured on this server.', 500));
  }

  let providedKey: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7).trim();
  } else if (typeof req.headers['x-api-key'] === 'string') {
    providedKey = req.headers['x-api-key'].trim();
  }

  if (!providedKey) {
    return next(new AppError('Unauthorized: Missing API key. Provide Bearer token or X-API-Key header.', 401));
  }

  // Timing-safe comparison to prevent timing attacks
  const configuredBuffer = Buffer.from(configuredKey);
  const providedBuffer = Buffer.from(providedKey);

  if (
    configuredBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(configuredBuffer, providedBuffer)
  ) {
    return next(new AppError('Unauthorized: Invalid API key.', 401));
  }

  next();
};
