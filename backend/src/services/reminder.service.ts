import { Role } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../utils/errorHandler';
import { taskService } from './task.service';

export class ReminderService {
  async getReminders(userId: string, dueOnly = false) {
    return prisma.taskReminder.findMany({
      where: {
        userId,
        isDone: false,
        ...(dueOnly ? { remindAt: { lte: new Date() } } : {}),
      },
      orderBy: { remindAt: 'asc' },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            customerName: true,
            company: true,
          },
        },
      },
    });
  }

  async createReminder(input: {
    taskId: string;
    userId: string;
    role: Role;
    userCompany?: string | null;
    userEmail?: string;
    remindAt: Date;
    note?: string;
  }) {
    await taskService.getTaskById(input.taskId, input.role, input.userId, input.userCompany, input.userEmail);

    if (Number.isNaN(input.remindAt.getTime())) {
      throw new AppError('Reminder date is invalid.', 400);
    }

    return prisma.taskReminder.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        remindAt: input.remindAt,
        note: input.note?.trim() || null,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            customerName: true,
            company: true,
          },
        },
      },
    });
  }

  async dismissReminder(id: string, userId: string) {
    const reminder = await prisma.taskReminder.findFirst({ where: { id, userId } });
    if (!reminder) throw new AppError('Reminder not found.', 404);

    return prisma.taskReminder.update({
      where: { id },
      data: { isDone: true },
    });
  }
}

export const reminderService = new ReminderService();
