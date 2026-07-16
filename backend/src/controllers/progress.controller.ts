import { Response } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { progressService } from '../services/user.service';
import { getParam } from '../utils/params';
import prisma from '../config/database';

export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const companyFilter = req.user!.role === 'SUPER_ADMIN' ? (req.query.company as string | undefined) : user?.company;
  const analytics = await progressService.getAnalytics(
    req.user!.role,
    req.user!.id,
    user?.department,
    user?.company,
    req.user!.email,
    companyFilter,
    req.query.dateFrom as string | undefined,
    req.query.dateTo as string | undefined
  );
  res.json({ success: true, data: analytics });
});

export const getProgressLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const logs = await progressService.getProgressLogs(getParam(req, 'taskId'));
  res.json({ success: true, data: logs });
});
