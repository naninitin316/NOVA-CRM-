import { Response } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { userService } from '../services/user.service';
import { getParam } from '../utils/params';
import prisma from '../config/database';

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const users = await userService.getUsers(req.user!.role, currentUser?.company);
  res.json({ success: true, data: users });
});

export const getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await userService.getUserById(getParam(req, 'id'));
  res.json({ success: true, data: user });
});

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const user = await userService.createUser(req.body, req.user!.role, currentUser?.company);
  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const user = await userService.updateUser(getParam(req, 'id'), req.body, req.user!.role, currentUser?.company);
  res.json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const result = await userService.deleteUser(getParam(req, 'id'), req.user!.role, currentUser?.company, req.user!.id);
  res.json({ success: true, data: result });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await userService.updateUser(req.user!.id, req.body);
  res.json({ success: true, data: user });
});
