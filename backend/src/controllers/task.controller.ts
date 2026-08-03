import { Response } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest, TaskFilters } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { AppError } from '../utils/errorHandler';
import { taskService } from '../services/task.service';
import { getParam } from '../utils/params';
import prisma from '../config/database';

export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filters: TaskFilters = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as 'asc' | 'desc',
    search: req.query.search as string,
    status: req.query.status as string,
    priority: req.query.priority as string,
    department: req.query.department as string,
    assignedTo: req.query.assignedTo as string,
    company: req.query.company as string,
    dateFrom: req.query.dateFrom as string,
    dateTo: req.query.dateTo as string,
  };

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const effectiveCompany = req.user!.role === Role.SUPER_ADMIN ? filters.company : user?.company;

  const result = await taskService.getTasks(
    req.user!.role,
    req.user!.id,
    user?.department,
    effectiveCompany,
    req.user!.email,
    filters
  );

  res.json({ success: true, data: result });
});

export const getTaskById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const task = await taskService.getTaskById(getParam(req, 'id'), req.user!.role, req.user!.id, user?.company, req.user!.email);
  res.json({ success: true, data: task });
});

export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    title,
    description,
    customerName,
    customerPhone,
    customerEmail,
    customerCompany,
    customerSource,
    assignedTo,
    status,
    priority,
    department,
    remarks,
    dueDate,
  } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const assignee = assignedTo ? await prisma.user.findUnique({ where: { id: assignedTo } }) : null;
  const isContributor = req.user!.role === Role.CONTRIBUTOR;
  if (isContributor && assignee) {
    if (!assignee.isActive) throw new AppError('Selected contributor is disabled.', 400);
    if (assignee.role !== Role.CONTRIBUTOR) throw new AppError('Contributors can only assign tasks to contributors.', 403);
    if (assignee.company !== user?.company) throw new AppError('Selected contributor is outside your company.', 403);
  }

  const effectiveAssignedTo = isContributor ? assignedTo || req.user!.id : assignedTo || undefined;
  const company = req.user!.role === Role.SUPER_ADMIN ? (req.body.company || assignee?.company || user?.company) : user?.company;

  const task = await taskService.createTask({
    title,
    description,
    customerName,
    customerPhone,
    customerEmail,
    customerCompany,
    customerSource,
    status,
    priority,
    company,
    department: isContributor ? assignee?.department || user?.department : department || assignee?.department,
    remarks,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    assignedTo: effectiveAssignedTo,
  });

  res.status(201).json({ success: true, data: task });
});

export const updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, 'id');
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const {
    title,
    description,
    customerName,
    customerPhone,
    customerEmail,
    customerCompany,
    customerSource,
    assignedTo,
    status,
    priority,
    department,
    remarks,
    dueDate,
  } = req.body;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (customerName !== undefined) updateData.customerName = customerName;
  if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
  if (customerEmail !== undefined) updateData.customerEmail = customerEmail;
  if (customerCompany !== undefined) updateData.customerCompany = customerCompany;
  if (customerSource !== undefined) updateData.customerSource = customerSource;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (department !== undefined) updateData.department = department;
  if (remarks !== undefined) updateData.remarks = remarks;
  if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
  if (assignedTo !== undefined) {
    updateData.assignedTo = assignedTo || null;
  }

  let task;
  if (req.user!.role === Role.MEMBER || req.user!.role === Role.CONTRIBUTOR || req.user!.role === Role.SALES_TEAM || req.user!.role === Role.HR_TEAM) {
    const allowed: Record<string, unknown> = {};
    if (status !== undefined) allowed.status = status;
    if (priority !== undefined && (req.user!.role === Role.MEMBER || req.user!.role === Role.CONTRIBUTOR)) allowed.priority = priority;
    if (remarks !== undefined) allowed.remarks = remarks;
    task = await taskService.updateTask(id, allowed, req.user!.id, req.user!.role, currentUser?.company, req.user!.email);
  } else if (req.user!.role === Role.VIEWER) {
    res.status(403).json({ success: false, error: 'Viewers cannot update tasks.' });
    return;
  } else {
    task = await taskService.updateTask(id, updateData, req.user!.id, req.user!.role, currentUser?.company, req.user!.email);
  }

  res.json({ success: true, data: task });
});

export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const result = await taskService.deleteTask(getParam(req, 'id'), req.user!.role, user?.company);
  res.json({ success: true, data: result });
});

export const assignTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignedTo } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const task = await taskService.assignTask(getParam(req, 'id'), assignedTo, req.user!.role, user?.company);
  res.json({ success: true, data: task });
});

export const addTaskComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { comment } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const taskComment = await taskService.addTaskComment(
    getParam(req, 'id'),
    req.user!.id,
    req.user!.role,
    comment,
    user?.company,
    req.user!.email
  );

  res.status(201).json({ success: true, data: taskComment });
});

export const createLeadTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const bulkAssignableRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.MEMBER];
  if (!bulkAssignableRoles.includes(req.user!.role)) {
    throw new AppError('Only admins and members can bulk assign lead tasks.', 403);
  }

  const { assignmentMode, department, assigneeIds, priority, dueDate, leads } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const result = await taskService.createLeadTasks({
    assignmentMode,
    department,
    company: req.user!.role === Role.SUPER_ADMIN ? req.body.company || user?.company : user?.company,
    assigneeIds,
    priority,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    leads,
  });

  res.status(201).json({ success: true, data: result });
});
