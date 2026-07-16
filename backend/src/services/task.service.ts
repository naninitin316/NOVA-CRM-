import prisma from '../config/database';
import { Role, Prisma, TaskStatus, Priority } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { TaskFilters } from '../types';

export class TaskService {
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

  private cleanEmail(email?: string) {
    const trimmed = email?.trim();
    if (!trimmed) return undefined;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : undefined;
  }

  private async ensureActiveAssignee(assignedTo?: string | null) {
    if (!assignedTo) return;
    const assignee = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { id: true, isActive: true },
    });
    if (!assignee) throw new AppError('Assignee not found.', 404);
    if (!assignee.isActive) throw new AppError('Assignee is disabled.', 400);
  }

  private belongsToCompany(task: { company?: string | null; assignee?: { company?: string | null } | null }, company?: string | null) {
    if (!company) return false;
    return task.company === company || (!task.company && task.assignee?.company === company);
  }

  /** Build where clause based on role and filters */
  private buildWhereClause(
    role: Role,
    userId: string,
    userDepartment: string | null | undefined,
    userCompany: string | null | undefined,
    userEmail: string,
    filters: TaskFilters
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {};
    const companyFilter = filters.company || userCompany || undefined;

    // Role-based access
    if (role === Role.SUPER_ADMIN) {
      if (companyFilter) {
        where.OR = [
          { company: companyFilter },
          { company: null, assignee: { is: { company: companyFilter } } },
        ];
      }
    } else if (role === Role.ADMIN || role === Role.MEMBER) {
      if (userCompany) {
        where.OR = [
          { company: userCompany },
          { company: null, assignee: { is: { company: userCompany } } },
        ];
      }
    } else if (role === Role.CONTRIBUTOR || role === Role.SALES_TEAM) {
      where.assignedTo = userId;
    } else if (role === Role.VIEWER) {
      if (userCompany) {
        where.OR = [
          { company: userCompany },
          { company: null, assignee: { is: { company: userCompany } } },
        ];
      }
    } else if (role === Role.HR_TEAM) {
      where.OR = [
        { department: 'HR' },
        { assignedTo: userId },
      ];
    }

    // Apply filters
    if (filters.search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            { remarks: { contains: filters.search, mode: 'insensitive' } },
            { customerName: { contains: filters.search, mode: 'insensitive' } },
            { customerPhone: { contains: filters.search, mode: 'insensitive' } },
            { customerEmail: { contains: filters.search, mode: 'insensitive' } },
            { customerCompany: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (filters.status) where.status = filters.status as TaskStatus;
    if (filters.priority) where.priority = filters.priority as Prisma.EnumPriorityFilter;
    if (filters.department) where.department = filters.department;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.dateFrom) createdAt.gte = this.toStartOfDay(filters.dateFrom);
      if (filters.dateTo) createdAt.lte = this.toEndOfDay(filters.dateTo);
      where.createdAt = createdAt;
    }
    return where;
  }

  async getTasks(
    role: Role,
    userId: string,
    userDepartment: string | null | undefined,
    userCompany: string | null | undefined,
    userEmail: string,
    filters: TaskFilters
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const where = this.buildWhereClause(role, userId, userDepartment, userCompany, userEmail, filters);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTaskById(id: string, role: Role, userId: string, userCompany?: string | null, userEmail?: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true, department: true, company: true } },
        progress: {
          orderBy: { updatedAt: 'desc' },
          include: { updater: { select: { id: true, name: true } } },
        },
        comments: {
          orderBy: { commentDate: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!task) throw new AppError('Task not found.', 404);

    // Access control
    if ((role === Role.ADMIN || role === Role.MEMBER) && !this.belongsToCompany(task, userCompany)) {
      throw new AppError('Access denied.', 403);
    }
    if ((role === Role.CONTRIBUTOR || role === Role.SALES_TEAM) && task.assignedTo !== userId) {
      throw new AppError('Access denied.', 403);
    }
    if (role === Role.VIEWER) {
      const belongsToCompany = task.company === userCompany || task.assignee?.company === userCompany;
      if (!belongsToCompany) {
        throw new AppError('Access denied.', 403);
      }
    }
    if (role === Role.HR_TEAM && task.department !== 'HR' && task.assignedTo !== userId) {
      throw new AppError('Access denied.', 403);
    }

    return task;
  }

  async addTaskComment(
    taskId: string,
    userId: string,
    role: Role,
    comment: string,
    userCompany?: string | null,
    userEmail?: string
  ) {
    await this.getTaskById(taskId, role, userId, userCompany, userEmail);

    return prisma.taskComment.create({
      data: {
        taskId,
        userId,
        comment,
      },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async createTask(data: Prisma.TaskUncheckedCreateInput) {
    await this.ensureActiveAssignee(typeof data.assignedTo === 'string' ? data.assignedTo : undefined);
    return prisma.task.create({
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async createLeadTasks(data: {
    assignmentMode: 'ROUND_ROBIN' | 'MANUAL';
    department: string;
    company?: string;
    assigneeIds?: string[];
    priority?: Priority;
    dueDate?: Date;
    leads: {
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      customerCompany?: string;
      customerSource?: string;
      description?: string;
      remarks?: string;
      assignedTo?: string;
    }[];
  }) {
    const cleanedLeads = data.leads
      .map((lead) => ({
        customerName: lead.customerName?.trim(),
        customerPhone: lead.customerPhone?.trim(),
        customerEmail: this.cleanEmail(lead.customerEmail),
        customerCompany: lead.customerCompany?.trim(),
        customerSource: lead.customerSource?.trim(),
        description: lead.description?.trim(),
        remarks: lead.remarks?.trim(),
        assignedTo: lead.assignedTo?.trim(),
      }))
      .filter((lead) =>
        Boolean(lead.customerName || lead.customerPhone || lead.customerEmail || lead.customerCompany)
      );

    if (!cleanedLeads.length) throw new AppError('No usable lead rows found.', 400);

    const requestedAssigneeIds = Array.from(new Set(data.assigneeIds || []));
    let uniqueAssigneeIds = requestedAssigneeIds;

    if (data.assignmentMode === 'ROUND_ROBIN' && !uniqueAssigneeIds.length) {
      const assignableUsers = await prisma.user.findMany({
        where: {
          company: data.company,
          department: data.department,
          isActive: true,
          role: { in: [Role.MEMBER, Role.CONTRIBUTOR, Role.SALES_TEAM, Role.HR_TEAM] },
        },
        orderBy: { name: 'asc' },
        select: { id: true },
      });
      uniqueAssigneeIds = assignableUsers.map((user) => user.id);
    }

    if (!uniqueAssigneeIds.length) {
      throw new AppError('Select at least one assignee for task distribution.', 400);
    }

    const users = await prisma.user.findMany({
        where: {
          id: { in: uniqueAssigneeIds },
          company: data.company,
          department: data.department,
          isActive: true,
          role: { in: [Role.MEMBER, Role.CONTRIBUTOR, Role.SALES_TEAM, Role.HR_TEAM] },
        },
      select: { id: true, department: true },
    });

    if (users.length !== uniqueAssigneeIds.length) {
      throw new AppError(`One or more assignees are invalid for the ${data.department} department.`, 400);
    }

    const userMap = new Map(users.map((user) => [user.id, user]));

    const tasks = await prisma.$transaction(
      cleanedLeads.map((lead, index) => {
        const assignedTo = uniqueAssigneeIds[index % uniqueAssigneeIds.length];
        const assignee = userMap.get(assignedTo);
        const customerLabel = lead.customerName || lead.customerCompany || lead.customerPhone || lead.customerEmail || `Lead ${index + 1}`;

        return prisma.task.create({
          data: {
            title: `Follow up with ${customerLabel}`,
            description: lead.description || 'Contact this lead and update the task status.',
            customerName: lead.customerName,
            customerPhone: lead.customerPhone,
            customerEmail: lead.customerEmail,
            customerCompany: lead.customerCompany,
            customerSource: lead.customerSource,
            company: data.company,
            remarks: lead.remarks,
            status: TaskStatus.ON_HOLD,
            priority: data.priority || Priority.MEDIUM,
            dueDate: data.dueDate,
            department: assignee?.department || data.department,
            assignedTo,
          },
          include: {
            assignee: { select: { id: true, name: true, email: true, department: true } },
          },
        });
      })
    );

    return { created: tasks.length, tasks };
  }

  async updateTask(id: string, data: Prisma.TaskUncheckedUpdateInput, updatedBy: string, role?: Role, userCompany?: string | null, userEmail?: string) {
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { company: true } } },
    });
    if (!existing) throw new AppError('Task not found.', 404);
    if ((role === Role.ADMIN || role === Role.MEMBER) && !this.belongsToCompany(existing, userCompany)) {
      throw new AppError('Access denied.', 403);
    }
    if ((role === Role.CONTRIBUTOR || role === Role.SALES_TEAM) && existing.assignedTo !== updatedBy) {
      throw new AppError('Access denied.', 403);
    }
    if (role === Role.VIEWER) {
      const belongsToCompany = existing.company === userCompany || existing.assignee?.company === userCompany;
      if (!belongsToCompany) {
        throw new AppError('Access denied.', 403);
      }
    }

    if (typeof data.assignedTo === 'string') {
      await this.ensureActiveAssignee(data.assignedTo);
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    // Log progress if status changed
    if (data.status && data.status !== existing.status) {
      await prisma.progress.create({
        data: {
          taskId: id,
          updatedBy,
          status: data.status as TaskStatus,
          remarks: typeof data.remarks === 'string' ? data.remarks : existing.remarks,
        },
      });
    }

    return task;
  }

  async deleteTask(id: string, role?: Role, userCompany?: string | null) {
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { company: true } } },
    });
    if (!existing) throw new AppError('Task not found.', 404);
    if (role !== Role.SUPER_ADMIN && !this.belongsToCompany(existing, userCompany)) {
      throw new AppError('Access denied.', 403);
    }
    await prisma.task.delete({ where: { id } });
    return { message: 'Task deleted successfully.' };
  }

  async assignTask(id: string, assignedTo: string, role?: Role, userCompany?: string | null) {
    await this.ensureActiveAssignee(assignedTo);
    const assignee = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { company: true, department: true },
    });
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { company: true } } },
    });
    if (!existing) throw new AppError('Task not found.', 404);
    if (role !== Role.SUPER_ADMIN && !this.belongsToCompany(existing, userCompany)) {
      throw new AppError('Access denied.', 403);
    }
    if (role !== Role.SUPER_ADMIN && assignee?.company !== userCompany) {
      throw new AppError('Assignee must belong to your company.', 403);
    }

    return prisma.task.update({
      where: { id },
      data: { assignedTo, department: assignee?.department || undefined },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export const taskService = new TaskService();
