import prisma from '../config/database';
import { Prisma, Role, TaskStatus } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { canManageUserStatus } from '../utils/permissions';
import { mailService } from './mail.service';

const WELCOME_EMAIL_DEADLINE_MS = 22000;

export class UserService {
  private async deliverWelcomeEmail(input: {
    to: string;
    name: string;
    email: string;
    password: string;
    role: Role;
    company?: string | null;
    department?: string | null;
    phone?: string | null;
  }) {
    try {
      return await mailService.sendWelcomeEmail(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Welcome email could not be sent.';
      console.error('[Mail] Failed to send welcome email after user creation', error);
      return { sent: false, error: message };
    }
  }

  private async deliverWelcomeEmailWithDeadline(input: {
    to: string;
    name: string;
    email: string;
    password: string;
    role: Role;
    company?: string | null;
    department?: string | null;
    phone?: string | null;
  }) {
    let timedOut = false;
    const delivery = this.deliverWelcomeEmail(input);
    const timeout = new Promise<{ sent: false; error: string }>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve({ sent: false, error: 'Welcome email was not sent before the timeout.' });
      }, WELCOME_EMAIL_DEADLINE_MS);
    });

    const result = await Promise.race([delivery, timeout]);
    if (timedOut) {
      void delivery.then((lateResult) => {
        if (!lateResult.sent) {
          console.warn(`[Mail] Welcome email failed after timeout for ${input.email}.`);
        }
      });
    }
    return result;
  }

  async getUsers(role: Role, company?: string | null) {
    const where =
      role === Role.SUPER_ADMIN
        ? {}
        : role === Role.MEMBER
          ? {
              company: company || undefined,
              role: { in: [Role.MEMBER, Role.CONTRIBUTOR, Role.SALES_TEAM, Role.HR_TEAM] },
            }
          : { company: company || undefined };

    return prisma.user.findMany({
      where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          company: true,
          department: true,
          phone: true,
          createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        company: true,
        department: true,
        phone: true,
        profileImage: true,
        createdAt: true,
      },
    });
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async updateUser(id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    department?: string;
    role?: Role;
    profileImage?: string;
    isActive?: boolean;
  }, requesterRole?: Role, requesterCompany?: string | null) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('User not found.', 404);
    if (requesterRole !== Role.SUPER_ADMIN && requesterCompany && existing.company !== requesterCompany) {
      throw new AppError('Access denied.', 403);
    }

    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailTaken) throw new AppError('Email already in use.', 409);
    }

    if (data.company) {
      const companyExists = await prisma.company.findUnique({ where: { name: data.company } });
      if (!companyExists) throw new AppError('Company not registered.', 400);
    }

    if (data.role) {
      const allowedRoles: Role[] =
        requesterRole === Role.SUPER_ADMIN
          ? [Role.SUPER_ADMIN, Role.ADMIN, Role.MEMBER, Role.CONTRIBUTOR, Role.VIEWER, Role.SUPPORT]
          : requesterRole === Role.ADMIN
            ? [Role.ADMIN, Role.MEMBER, Role.CONTRIBUTOR, Role.VIEWER]
            : [];
      if (!allowedRoles.includes(data.role)) {
        throw new AppError('You cannot assign this role.', 403);
      }
      if (data.role === Role.SUPER_ADMIN) {
        data.company = 'Platform';
        data.department = 'Platform';
      } else if (data.role === Role.SUPPORT) {
        data.company = 'Platform';
        data.department = data.department || 'Support';
      }
    }

    if (data.isActive !== undefined && !canManageUserStatus(requesterRole || Role.CONTRIBUTOR)) {
      throw new AppError('You cannot change employee status.', 403);
    }

    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        company: true,
        department: true,
        phone: true,
        profileImage: true,
      },
    });
  }

  async deleteUser(id: string, requesterRole?: Role, requesterCompany?: string | null, requesterId?: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('User not found.', 404);
    if (requesterId && id === requesterId) {
      throw new AppError('You cannot delete your own account.', 400);
    }
    if (existing.role === Role.SUPER_ADMIN && requesterRole !== Role.SUPER_ADMIN) {
      throw new AppError('You cannot delete this user.', 403);
    }
    if (requesterRole !== Role.SUPER_ADMIN && requesterCompany && existing.company !== requesterCompany) {
      throw new AppError('Access denied.', 403);
    }
    await prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully.' };
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    isActive?: boolean;
    company?: string;
    department?: string;
    phone?: string;
  }, requesterRole?: Role, requesterCompany?: string | null) {
    const bcrypt = await import('bcryptjs');
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered.', 409);
    const isPlatformRole = data.role === Role.SUPER_ADMIN || data.role === Role.SUPPORT;
    const company = isPlatformRole
      ? 'Platform'
      : requesterRole === Role.SUPER_ADMIN
        ? data.company
        : requesterCompany;
    if (!company) throw new AppError('Company is required.', 400);
    const companyExists = await prisma.company.findUnique({ where: { name: company } });
    if (!companyExists) throw new AppError('Company not registered.', 400);

    const allowedRoles: Role[] =
      requesterRole === Role.SUPER_ADMIN
        ? [Role.SUPER_ADMIN, Role.ADMIN, Role.MEMBER, Role.CONTRIBUTOR, Role.VIEWER, Role.SUPPORT]
        : requesterRole === Role.ADMIN
          ? [Role.ADMIN, Role.MEMBER, Role.CONTRIBUTOR, Role.VIEWER]
          : requesterRole === Role.MEMBER
            ? [Role.CONTRIBUTOR]
            : [];
    if (!allowedRoles.includes(data.role)) {
      throw new AppError('You cannot create this role.', 403);
    }

    if (data.isActive !== undefined && !canManageUserStatus(requesterRole || Role.CONTRIBUTOR)) {
      throw new AppError('You cannot change employee status.', 403);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    let user;
    try {
      user = await prisma.user.create({
        data: {
          ...data,
          company,
          department: data.role === Role.SUPER_ADMIN
            ? 'Platform'
            : data.role === Role.SUPPORT
              ? (data.department || 'Support')
              : data.department,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          company: true,
          department: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('Email already registered.', 409);
      }
      throw error;
    }

    const welcomeEmail = await this.deliverWelcomeEmailWithDeadline({
      to: user.email,
      name: user.name,
      email: user.email,
      password: data.password,
      role: user.role,
      company,
      department: user.department,
      phone: data.phone || null,
    });

    return {
      ...user,
      welcomeEmail,
    };
  }
}

export class ProgressService {
  private toStartOfDay(value: string) {
    const date = new Date(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(0, 0, 0, 0);
    return date;
  }

  private toEndOfDay(value: string) {
    const date = new Date(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(23, 59, 59, 999);
    return date;
  }

  async getAnalytics(
    role: Role,
    userId: string,
    userDepartment?: string | null,
    userCompany?: string | null,
    userEmail?: string,
    companyFilter?: string | null,
    dateFrom?: string | null,
    dateTo?: string | null
  ) {
    const taskWhere: Record<string, unknown> = {};

    if (role === Role.SUPER_ADMIN) {
      if (companyFilter) {
        taskWhere.OR = [
          { company: companyFilter },
          { company: null, assignee: { is: { company: companyFilter } } },
        ];
      }
    } else if (role === Role.ADMIN || role === Role.MEMBER) {
      if (userCompany) {
        taskWhere.OR = [
          { company: userCompany },
          { company: null, assignee: { is: { company: userCompany } } },
        ];
      }
    } else if (role === Role.CONTRIBUTOR || role === Role.SALES_TEAM) {
      taskWhere.assignedTo = userId;
    } else if (role === Role.VIEWER) {
      if (userCompany) {
        taskWhere.OR = [
          { company: userCompany },
          { company: null, assignee: { is: { company: userCompany } } },
        ];
      }
    } else if (role === Role.HR_TEAM) {
      taskWhere.OR = [{ department: 'HR' }, { assignedTo: userId }];
    }

    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = this.toStartOfDay(dateFrom);
      if (dateTo) createdAt.lte = this.toEndOfDay(dateTo);
      taskWhere.createdAt = createdAt;
    }

    const [total, processed, rejected, onHold, tasks] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: TaskStatus.PROCESSED } }),
      prisma.task.count({ where: { ...taskWhere, status: TaskStatus.REJECTED } }),
      prisma.task.count({ where: { ...taskWhere, status: TaskStatus.ON_HOLD } }),
      prisma.task.findMany({
        where: taskWhere,
        select: {
          id: true,
          status: true,
          priority: true,
          department: true,
          createdAt: true,
          assignee: { select: { id: true, name: true } },
        },
      }),
    ]);

    const completionPercentage = total > 0 ? Math.round((processed / total) * 100) : 0;

    // Monthly performance (last 6 months)
    const monthlyPerformance = this.getMonthlyPerformance(tasks);

    // Status distribution
    const statusDistribution = [
      { status: 'PROCESSED', count: processed, color: '#10B981' },
      { status: 'REJECTED', count: rejected, color: '#EF4444' },
      { status: 'ON_HOLD', count: onHold, color: '#F59E0B' },
    ];

    // Department performance
    const departmentMap = new Map<string, { total: number; processed: number }>();
    tasks.forEach((task) => {
      const dept = task.department || 'Unassigned';
      const current = departmentMap.get(dept) || { total: 0, processed: 0 };
      current.total++;
      if (task.status === TaskStatus.PROCESSED) current.processed++;
      departmentMap.set(dept, current);
    });

    const departmentPerformance = Array.from(departmentMap.entries()).map(([department, stats]) => ({
      department,
      total: stats.total,
      processed: stats.processed,
      percentage: stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0,
    }));

    // Team performance
    const teamMap = new Map<string, { name: string; total: number; processed: number }>();
    tasks.forEach((task) => {
      if (!task.assignee) return;
      const current = teamMap.get(task.assignee.id) || {
        name: task.assignee.name,
        total: 0,
        processed: 0,
      };
      current.total++;
      if (task.status === TaskStatus.PROCESSED) current.processed++;
      teamMap.set(task.assignee.id, current);
    });

    const teamPerformance = Array.from(teamMap.values()).map((member) => ({
      ...member,
      percentage: member.total > 0 ? Math.round((member.processed / member.total) * 100) : 0,
    }));

    // Priority distribution
    const priorityDistribution = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => ({
      priority,
      count: tasks.filter((t) => t.priority === priority).length,
    }));

    return {
      overview: {
        total,
        processed,
        rejected,
        onHold,
        completionPercentage,
      },
      monthlyPerformance,
      statusDistribution,
      departmentPerformance,
      teamPerformance,
      priorityDistribution,
    };
  }

  private getMonthlyPerformance(tasks: { status: TaskStatus; createdAt: Date }[]) {
    const months: { month: string; processed: number; rejected: number; onHold: number; total: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      const monthTasks = tasks.filter((t) => {
        const d = new Date(t.createdAt);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });

      months.push({
        month: monthStr,
        processed: monthTasks.filter((t) => t.status === TaskStatus.PROCESSED).length,
        rejected: monthTasks.filter((t) => t.status === TaskStatus.REJECTED).length,
        onHold: monthTasks.filter((t) => t.status === TaskStatus.ON_HOLD).length,
        total: monthTasks.length,
      });
    }

    return months;
  }

  async getProgressLogs(taskId: string) {
    return prisma.progress.findMany({
      where: { taskId },
      orderBy: { updatedAt: 'desc' },
      include: {
        updater: { select: { id: true, name: true } },
      },
    });
  }
}

export const userService = new UserService();
export const progressService = new ProgressService();
