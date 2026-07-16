import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { getParam } from '../utils/params';
import { reminderService } from '../services/reminder.service';

export const getReminders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reminders = await reminderService.getReminders(req.user!.id, req.query.due === 'true');
  res.json({ success: true, data: reminders });
});

export const createReminder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const reminder = await reminderService.createReminder({
    taskId: req.body.taskId,
    userId: req.user!.id,
    role: req.user!.role,
    userCompany: user?.company,
    userEmail: req.user!.email,
    remindAt: new Date(req.body.remindAt),
    note: req.body.note,
  });
  res.status(201).json({ success: true, data: reminder });
});

export const dismissReminder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reminder = await reminderService.dismissReminder(getParam(req, 'id'), req.user!.id);
  res.json({ success: true, data: reminder });
});
