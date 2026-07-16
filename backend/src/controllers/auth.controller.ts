import { Response } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { authService } from '../services/auth.service';

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json({ success: true, data: result });
});

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await authService.getProfile(req.user!.id);
  res.json({ success: true, data: profile });
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);
  res.json({ success: true, data: result });
});
