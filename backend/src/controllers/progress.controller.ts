import { Response } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { progressService } from '../services/user.service';
import { getParam } from '../utils/params';
import prisma from '../config/database';
import { AppError } from '../utils/errorHandler';

const getCurrentUser = async (req: AuthRequest) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.isActive) throw new AppError('User not found or inactive.', 401);
  return user;
};

export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await getCurrentUser(req);
  const companyFilter = user.role === 'SUPER_ADMIN' ? (req.query.company as string | undefined) : user.company;
  const analytics = await progressService.getAnalytics(
    user.role,
    user.id,
    user.department,
    user.company,
    user.email,
    companyFilter,
    req.query.dateFrom as string | undefined,
    req.query.dateTo as string | undefined
  );
  res.json({ success: true, data: analytics });
});

export const getProgressLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await getCurrentUser(req);
  const logs = await progressService.getProgressLogs(
    getParam(req, 'taskId'),
    user.role,
    user.id,
    user.company,
    user.email
  );
  res.json({ success: true, data: logs });
});
