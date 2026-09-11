import { Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { onlineLeadService } from '../services/online-lead.service';

export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    phone,
    email,
    company = process.env.META_DEFAULT_COMPANY || 'Komu Infra',
    project = process.env.META_DEFAULT_PROJECT || 'Shades of Green',
    source = 'API Intake',
    message,
    remarks,
    created_at,
  } = req.body;

  const lead = await onlineLeadService.createOnlineLead({
    company,
    name,
    phone,
    email,
    project,
    message: message || remarks,
    source,
    createdAt: created_at,
  });

  res.status(201).json({
    success: true,
    message: 'Lead received and recorded successfully.',
    data: lead,
  });
});

export const getLeadApiInfo = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Nova CRM Leads Intake API is active.',
    usage: 'Send a POST request with Authorization: Bearer <API_KEY> header and lead JSON body.',
  });
});
