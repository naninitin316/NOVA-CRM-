import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { getParam } from '../utils/params';
import { companyService } from '../services/company.service';

export const getCompanies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const companies = await companyService.getCompanies(req.user!.role, currentUser?.company);
  res.json({ success: true, data: companies });
});

export const getCompanyByName = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const company = await companyService.getCompanyByName(decodeURIComponent(getParam(req, 'name')), req.user!.role, currentUser?.company);
  res.json({ success: true, data: company });
});

export const createCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const company = await companyService.createCompany(req.body);
  res.status(201).json({ success: true, data: company });
});

export const updateCompanyStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const company = await companyService.updateCompanyStatus(
    decodeURIComponent(getParam(req, 'name')),
    req.body.isActive
  );
  res.json({ success: true, data: company });
});

export const deleteCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await companyService.deleteCompany(decodeURIComponent(getParam(req, 'name')));
  res.json({ success: true, data: result });
});
