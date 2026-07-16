import { Response } from 'express';
import { SupportStatus } from '@prisma/client';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { getParam } from '../utils/params';
import { supportService } from '../services/support.service';

export const getSupportTickets = asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
  const tickets = await supportService.getTickets(
    req.user!.role,
    req.user!.id,
    req.user?.company || null,
    req.query.status ? { status: req.query.status as SupportStatus } : undefined
  );
  res.json({ success: true, data: tickets });
});

export const getSupportTicketById = asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
  const ticket = await supportService.getTicketById(getParam(req, 'id'), req.user!.role, req.user!.id, req.user?.company || null);
  res.json({ success: true, data: ticket });
});

export const createSupportTicket = asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
  const ticket = await supportService.createTicket(
    {
      subject: req.body.subject,
      message: req.body.message,
    },
    req.user!
  );
  res.status(201).json({ success: true, data: ticket });
});

export const replyToSupportTicket = asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
  const ticket = await supportService.replyToTicket(
    getParam(req, 'id'),
    req.user!,
    req.body.message
  );
  res.json({ success: true, data: ticket });
});

export const updateSupportTicket = asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
  const ticket = await supportService.updateTicket(
    getParam(req, 'id'),
    req.user!,
    {
      status: req.body.status,
      assignedToId: req.body.assignedToId,
    }
  );
  res.json({ success: true, data: ticket });
});
