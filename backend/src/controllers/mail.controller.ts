import { Response } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { mailService } from '../services/mail.service';

export const getMailStatus = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: mailService.getPublicStatus() });
});

export const verifyMail = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const status = await mailService.verify();
  res.json({ success: true, data: status, message: 'SMTP connection verified.' });
});

export const sendTestMail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const to = (req.body.email || req.body.to || req.user?.email || '').trim();
  if (!to) {
    res.status(400).json({ success: false, error: 'Email is required.' });
    return;
  }

  const result = await mailService.sendTestEmail(to);
  res.json({ success: true, data: result, message: `Test welcome email sent to ${to}.` });
});
