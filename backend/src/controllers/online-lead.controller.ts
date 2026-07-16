import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { getParam } from '../utils/params';
import { onlineLeadService } from '../services/online-lead.service';

export const createOnlineLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await onlineLeadService.createOnlineLead(req.body);
  res.status(201).json({ success: true, data: lead });
});

export const getOnlineLeads = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const leads = await onlineLeadService.getOnlineLeads(
    req.user!.role,
    currentUser?.company,
    req.query.company as string | undefined
  );
  res.json({ success: true, data: leads });
});

export const assignOnlineLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const lead = await onlineLeadService.assignOnlineLead(
    getParam(req, 'id'),
    req.body.assignedTo,
    req.user!.role,
    currentUser?.company
  );
  res.json({ success: true, data: lead });
});
