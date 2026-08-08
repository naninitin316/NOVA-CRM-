import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { getParam } from '../utils/params';
import { companyService } from '../services/company.service';
import { AppError } from '../utils/errorHandler';

const getCurrentUser = async (req: AuthRequest) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.isActive) throw new AppError('User not found or inactive.', 401);
  return user;
};

export const getCompanies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await getCurrentUser(req);
  const companies = await companyService.getCompanies(currentUser.role, currentUser.company);
  res.json({ success: true, data: companies });
});

export const getCompanyByName = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await getCurrentUser(req);
  const company = await companyService.getCompanyByName(
    decodeURIComponent(getParam(req, 'name')),
    currentUser.role,
    currentUser.id,
    currentUser.company
  );
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
