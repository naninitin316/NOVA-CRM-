import prisma from '../config/database';
import { Role, Prisma, TaskStatus, Priority } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { TaskFilters } from '../types';

export class TaskService {
  private canViewCompanyTasks(role?: Role) {
    return role === Role.SUPER_ADMIN || role === Role.ADMIN;
  }

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

  private normalizePhone(phone?: string | null) {
    const digits = phone?.replace(/\D/g, '') || '';
    if (!digits) return undefined;
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  private defaultDueDate() {
    return new Date(Date.now() + 30 * 60 * 1000);
  }

  private normalizeText(value?: string | null) {
    return value?.trim().toLowerCase().replace(/\s+/g, ' ') || undefined;
  }

  private leadKeys(lead: {
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerName?: string | null;
    customerCompany?: string | null;
    description?: string | null;
  }) {
    const keys: string[] = [];
    const email = this.cleanEmail(lead.customerEmail || undefined)?.toLowerCase();
    const phone = this.normalizePhone(lead.customerPhone);
    const name = this.normalizeText(lead.customerName);
    const company = this.normalizeText(lead.customerCompany);
    const description = this.normalizeText(lead.description);

    if (email) keys.push(`email:${email}`);
    if (phone) keys.push(`phone:${phone}`);
    if (name && company) keys.push(`name-company:${name}:${company}`);
    if (name && description) keys.push(`name-description:${name}:${description}`);
    return keys;
  }

  private scopeLeadKey(key?: string, company?: string | null) {
    const normalizedCompany = this.normalizeText(company);
    if (!key) return undefined;
    return normalizedCompany ? `company:${normalizedCompany}:${key}` : key;
  }

  private leadIdentity(lead: {
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerName?: string | null;
    customerCompany?: string | null;
    description?: string | null;
  }, company?: string | null) {
    const email = this.cleanEmail(lead.customerEmail || undefined)?.toLowerCase();
    const phone = this.normalizePhone(lead.customerPhone);
    const name = this.normalizeText(lead.customerName);
    const customerCompany = this.normalizeText(lead.customerCompany);
    const description = this.normalizeText(lead.description);
    const fallback = !email && !phone
      ? (name && customerCompany ? `name-company:${name}:${customerCompany}` : name && description ? `name-description:${name}:${description}` : undefined)
      : undefined;

    return {
      leadEmailKey: this.scopeLeadKey(email ? `email:${email}` : undefined, company),
      leadPhoneKey: this.scopeLeadKey(phone ? `phone:${phone}` : undefined, company),
      leadFallbackKey: this.scopeLeadKey(fallback, company),
    };
  }

  private hasDuplicateLead(
    lead: { customerEmail?: string | null; customerPhone?: string | null; customerName?: string | null; customerCompany?: string | null; description?: string | null },
    existingKeys: Set<string>
  ) {
    const keys = this.leadKeys(lead);
    return keys.length > 0 && keys.some((key) => existingKeys.has(key));
  }

  private handleLeadUniqueError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.some((field) => ['leadEmailKey', 'leadPhoneKey', 'leadFallbackKey'].includes(String(field)))
    ) {
      throw new AppError('A task for this lead already exists.', 409);
    }
    throw error;
  }

  private async ensureUniqueLeadTask(lead: {
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerName?: string | null;
    customerCompany?: string | null;
    description?: string | null;
  }, company?: string | null) {
    const keys = this.leadKeys(lead);
    if (!keys.length) return;

    const existingTasks = await prisma.task.findMany({
      where: company ? { company } : undefined,
      select: {
        customerEmail: true,
        customerPhone: true,
        customerName: true,
        customerCompany: true,
        description: true,
        leadEmailKey: true,
        leadPhoneKey: true,
        leadFallbackKey: true,
      },
    });
    const existingKeys = new Set(existingTasks.flatMap((task) => [
      ...this.leadKeys(task),
      task.leadEmailKey?.replace(/^company:[^:]+:/, ''),
      task.leadPhoneKey?.replace(/^company:[^:]+:/, ''),
      task.leadFallbackKey?.replace(/^company:[^:]+:/, ''),
    ].filter(Boolean) as string[]));

    if (keys.some((key) => existingKeys.has(key))) {
      throw new AppError('A task for this lead already exists.', 409);
    }
  }

  private async ensureActiveAssignee(assignedTo?: string | null, company?: string | null) {
    if (!assignedTo) return null;
    const assignee = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { id: true, isActive: true, company: true, department: true },
    });
    if (!assignee) throw new AppError('Assignee not found.', 404);
    if (!assignee.isActive) throw new AppError('Assignee is disabled.', 400);
    if (company && assignee.company !== company) {
      throw new AppError('Assignee must belong to the same company.', 403);
    }
    return assignee;
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
    } else if (role === Role.ADMIN) {
      if (userCompany) {
        where.OR = [
          { company: userCompany },
          { company: null, assignee: { is: { company: userCompany } } },
        ];
      }
    } else if (role === Role.MEMBER || role === Role.CONTRIBUTOR || role === Role.SALES_TEAM || role === Role.VIEWER || role === Role.HR_TEAM) {
      where.assignedTo = userId;
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
    if (filters.assignedTo) {
      where.assignedTo = this.canViewCompanyTasks(role) ? filters.assignedTo : userId;
    }
    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.dateFrom) createdAt.gte = this.toStartOfDay(filters.dateFrom);
      if (filters.dateTo) createdAt.lte = this.toEndOfDay(filters.dateTo);
      where.createdAt = createdAt;
    }
    if (filters.updatedFrom || filters.updatedTo) {
      const updatedAt: Prisma.DateTimeFilter = {};
      if (filters.updatedFrom) updatedAt.gte = this.toStartOfDay(filters.updatedFrom);
      if (filters.updatedTo) updatedAt.lte = this.toEndOfDay(filters.updatedTo);
      where.updatedAt = updatedAt;
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
          progress: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            include: { updater: { select: { id: true, name: true } } },
          },
          comments: {
            orderBy: { commentDate: 'desc' },
            include: { user: { select: { id: true, name: true } } },
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
    if (this.canViewCompanyTasks(role) && role !== Role.SUPER_ADMIN && !this.belongsToCompany(task, userCompany)) {
      throw new AppError('Access denied.', 403);
    }
    if (!this.canViewCompanyTasks(role) && task.assignedTo !== userId) {
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
    await this.ensureActiveAssignee(
      typeof data.assignedTo === 'string' ? data.assignedTo : undefined,
      typeof data.company === 'string' ? data.company : undefined
    );
    await this.ensureUniqueLeadTask({
      customerEmail: typeof data.customerEmail === 'string' ? data.customerEmail : undefined,
      customerPhone: typeof data.customerPhone === 'string' ? data.customerPhone : undefined,
      customerName: typeof data.customerName === 'string' ? data.customerName : undefined,
      customerCompany: typeof data.customerCompany === 'string' ? data.customerCompany : undefined,
      description: typeof data.description === 'string' ? data.description : undefined,
    }, typeof data.company === 'string' ? data.company : undefined);
    try {
      return await prisma.task.create({
        data: {
          ...data,
          ...this.leadIdentity({
            customerEmail: typeof data.customerEmail === 'string' ? data.customerEmail : undefined,
            customerPhone: typeof data.customerPhone === 'string' ? data.customerPhone : undefined,
            customerName: typeof data.customerName === 'string' ? data.customerName : undefined,
            customerCompany: typeof data.customerCompany === 'string' ? data.customerCompany : undefined,
            description: typeof data.description === 'string' ? data.description : undefined,
          }, typeof data.company === 'string' ? data.company : undefined),
          dueDate: data.dueDate || this.defaultDueDate(),
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      });
    } catch (error) {
      this.handleLeadUniqueError(error);
    }
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

    const existingTasks = await prisma.task.findMany({
      where: data.company ? { company: data.company } : undefined,
      select: {
        customerEmail: true,
        customerPhone: true,
        customerName: true,
        customerCompany: true,
        description: true,
        leadEmailKey: true,
        leadPhoneKey: true,
        leadFallbackKey: true,
      },
    });
    const existingKeys = new Set(existingTasks.flatMap((task) => [
      ...this.leadKeys(task),
      task.leadEmailKey?.replace(/^company:[^:]+:/, ''),
      task.leadPhoneKey?.replace(/^company:[^:]+:/, ''),
      task.leadFallbackKey?.replace(/^company:[^:]+:/, ''),
    ].filter(Boolean) as string[]));
    const importKeys = new Set<string>();
    const uniqueLeads = cleanedLeads.filter((lead) => {
      const keys = this.leadKeys(lead);
      if (!keys.length) return true;
      if (keys.some((key) => existingKeys.has(key) || importKeys.has(key))) return false;
      keys.forEach((key) => importKeys.add(key));
      return true;
    });

    if (!uniqueLeads.length) throw new AppError('All uploaded lead rows already exist as tasks.', 409);

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

    let tasks;
    try {
      tasks = await prisma.$transaction(
        uniqueLeads.map((lead, index) => {
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
              ...this.leadIdentity(lead, data.company),
              company: data.company,
              remarks: lead.remarks,
              status: TaskStatus.ON_HOLD,
              priority: data.priority || Priority.MEDIUM,
              dueDate: data.dueDate || this.defaultDueDate(),
              department: assignee?.department || data.department,
              assignedTo,
            },
            include: {
              assignee: { select: { id: true, name: true, email: true, department: true } },
            },
          });
        })
      );
    } catch (error) {
      this.handleLeadUniqueError(error);
    }

    return { created: tasks.length, skipped: cleanedLeads.length - uniqueLeads.length, tasks };
  }

  async updateTask(id: string, data: Prisma.TaskUncheckedUpdateInput, updatedBy: string, role?: Role, userCompany?: string | null, userEmail?: string) {
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { company: true } } },
    });
    if (!existing) throw new AppError('Task not found.', 404);
    if (this.canViewCompanyTasks(role) && role !== Role.SUPER_ADMIN && !this.belongsToCompany(existing, userCompany)) {
      throw new AppError('Access denied.', 403);
    }
    if (!this.canViewCompanyTasks(role) && existing.assignedTo !== updatedBy) {
      throw new AppError('Access denied.', 403);
    }

    if (typeof data.assignedTo === 'string') {
      const targetCompany = typeof data.company === 'string' ? data.company : existing.company || userCompany;
      await this.ensureActiveAssignee(data.assignedTo, targetCompany);
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
    const assignee = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { company: true, department: true, isActive: true },
    });
    if (!assignee) throw new AppError('Assignee not found.', 404);
    if (!assignee.isActive) throw new AppError('Assignee is disabled.', 400);
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
