import { Priority, Role, TaskStatus } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../utils/errorHandler';

const ONLINE_LEAD_SOURCE = 'Online Lead';
const ONLINE_LEAD_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];
const ASSIGNABLE_ROLES: Role[] = [Role.CONTRIBUTOR, Role.SALES_TEAM, Role.HR_TEAM];

export class OnlineLeadService {
  private cleanEmail(email?: string) {
    const trimmed = email?.trim();
    if (!trimmed) return undefined;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : undefined;
  }

  async createOnlineLead(data: {
    company: string;
    name?: string;
    phone?: string;
    email?: string;
    project?: string;
    message?: string;
    source?: string;
  }) {
    const company = data.company.trim();
    const companyExists = await prisma.company.findUnique({ where: { name: company } });
    if (!companyExists) throw new AppError('Company not registered.', 400);

    const customerName = data.name?.trim();
    const customerPhone = data.phone?.trim();
    const customerEmail = this.cleanEmail(data.email);
    const project = data.project?.trim();
    const message = data.message?.trim();
    const source = data.source?.trim();

    if (!customerName && !customerPhone && !customerEmail) {
      throw new AppError('Name, phone, or email is required.', 400);
    }

    const label = customerName || customerPhone || customerEmail || 'Website visitor';

    return prisma.task.create({
      data: {
        title: `Online lead: ${label}`,
        description: message || 'Website visitor submitted their details for follow-up.',
        customerName,
        customerPhone,
        customerEmail,
        customerCompany: project,
        customerSource: ONLINE_LEAD_SOURCE,
        company,
        department: 'Sales',
        status: TaskStatus.ON_HOLD,
        priority: Priority.MEDIUM,
        remarks: source ? `Created from website lead form. Source: ${source}.` : 'Created from website lead form.',
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, department: true } },
      },
    });
  }

  async getOnlineLeads(role: Role, userCompany?: string | null, companyFilter?: string | null) {
    if (!ONLINE_LEAD_ROLES.includes(role)) {
      throw new AppError('Access denied.', 403);
    }

    const company = role === Role.SUPER_ADMIN ? companyFilter || undefined : userCompany || undefined;
    if (role !== Role.SUPER_ADMIN && !company) throw new AppError('Company is required.', 400);

    return prisma.task.findMany({
      where: {
        customerSource: ONLINE_LEAD_SOURCE,
        ...(company ? { company } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true, email: true, department: true } },
      },
    });
  }

  async assignOnlineLead(id: string, assignedTo: string, role: Role, userCompany?: string | null) {
    if (!ONLINE_LEAD_ROLES.includes(role)) {
      throw new AppError('Access denied.', 403);
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.customerSource !== ONLINE_LEAD_SOURCE) {
      throw new AppError('Online lead not found.', 404);
    }
    if (role !== Role.SUPER_ADMIN && task.company !== userCompany) {
      throw new AppError('Access denied.', 403);
    }

    const assignee = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { id: true, company: true, department: true, role: true, isActive: true },
    });
    if (!assignee) throw new AppError('Contributor not found.', 404);
    if (!assignee.isActive) throw new AppError('Contributor is disabled.', 400);
    if (assignee.company !== task.company) throw new AppError('Contributor must belong to the same company.', 400);
    if (!ASSIGNABLE_ROLES.includes(assignee.role)) {
      throw new AppError('Select a contributor for follow-up.', 400);
    }

    return prisma.task.update({
      where: { id },
      data: {
        assignedTo,
        department: assignee.department || task.department || 'Sales',
        remarks: task.remarks || 'Assigned from online lead queue.',
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, department: true } },
      },
    });
  }
}

export const onlineLeadService = new OnlineLeadService();
