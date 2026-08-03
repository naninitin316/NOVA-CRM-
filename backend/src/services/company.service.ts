import { Prisma, Role } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../utils/errorHandler';
import { TaskStatus } from '@prisma/client';
import type { CompanyCreateInput } from '../types';
import { mailService } from './mail.service';

export class CompanyService {
  async getCompanies(role: Role, userCompany?: string | null) {
    const where = role === Role.SUPER_ADMIN ? {} : userCompany ? { name: userCompany } : {};
    const companies = await prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const users = await prisma.user.findMany({
      where: role === Role.SUPER_ADMIN ? {} : userCompany ? { company: userCompany } : { company: null },
      select: {
        company: true,
        role: true,
        isActive: true,
      },
    });

    const counts = new Map<string, { userCount: number; activeUserCount: number; adminCount: number; memberCount: number; contributorCount: number }>();
    users.forEach((user) => {
      const company = user.company || 'Unassigned';
      const current = counts.get(company) || { userCount: 0, activeUserCount: 0, adminCount: 0, memberCount: 0, contributorCount: 0 };
      current.userCount++;
      if (user.isActive) current.activeUserCount++;
      if (user.role === Role.ADMIN) current.adminCount++;
      if (user.role === Role.MEMBER) current.memberCount++;
      if (user.role === Role.CONTRIBUTOR || user.role === Role.SALES_TEAM || user.role === Role.HR_TEAM) current.contributorCount++;
      counts.set(company, current);
    });

    return companies.map((company) => ({
      ...company,
      ...(counts.get(company.name) || { userCount: 0, activeUserCount: 0, adminCount: 0, memberCount: 0, contributorCount: 0 }),
    }));
  }

  async getCompanyByName(name: string, role: Role, userId: string, userCompany?: string | null) {
    if (role !== Role.SUPER_ADMIN && userCompany !== name) {
      throw new AppError('Access denied.', 403);
    }

    const company = await prisma.company.findUnique({ where: { name } });
    if (!company) throw new AppError('Company not found.', 404);

    const users = await prisma.user.findMany({
      where: role === Role.MEMBER ? { company: name, role: Role.CONTRIBUTOR } : { company: name },
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

    const canViewCompanyTasks = role === Role.SUPER_ADMIN || role === Role.ADMIN;
    const taskWhere: Prisma.TaskWhereInput = canViewCompanyTasks
      ? {
          OR: [
            { company: name },
            { company: null, assignee: { is: { company: name } } },
          ],
        }
      : { assignedTo: userId };
    const [taskCount, processedTaskCount, rejectedTaskCount, onHoldTaskCount, recentTasks, tasks] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: TaskStatus.PROCESSED } }),
      prisma.task.count({ where: { ...taskWhere, status: TaskStatus.REJECTED } }),
      prisma.task.count({ where: { ...taskWhere, status: TaskStatus.ON_HOLD } }),
      prisma.task.findMany({
        where: taskWhere,
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          department: true,
          createdAt: true,
          updatedAt: true,
          assignee: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.task.findMany({
        where: taskWhere,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          customerCompany: true,
          customerSource: true,
          company: true,
          status: true,
          priority: true,
          department: true,
          remarks: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          assignee: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      ...company,
      users,
      userCount: users.length,
      adminCount: users.filter((user) => user.role === Role.ADMIN).length,
      memberCount: users.filter((user) => user.role === Role.MEMBER).length,
      contributorCount: users.filter(
        (user) => user.role === Role.CONTRIBUTOR || user.role === Role.SALES_TEAM || user.role === Role.HR_TEAM
      ).length,
      activeUserCount: users.filter((user) => user.isActive).length,
      taskCount,
      processedTaskCount,
      rejectedTaskCount,
      onHoldTaskCount,
      recentTasks,
      tasks,
    };
  }

  async createCompany(data: CompanyCreateInput) {
    const trimmed = data.name?.trim() || '';
    if (!trimmed) throw new AppError('Company name is required.', 400);
    const director = data.director?.trim() || '';
    const gstNo = data.gstNo?.trim() || '';
    const phone = data.phone?.trim() || '';
    const logo = data.logo?.trim() || null;
    if (!director) throw new AppError('Director name is required.', 400);
    if (!gstNo) throw new AppError('GST number is required.', 400);
    if (!phone) throw new AppError('Phone number is required.', 400);

    const existing = await prisma.company.findUnique({ where: { name: trimmed } });
    if (existing) {
      if (data.employees?.length) {
        throw new AppError('Company already exists.', 409);
      }
      return existing;
    }

    const employees = (data.employees || [])
      .map((employee) => ({
        name: employee.name.trim(),
        email: employee.email.trim(),
        password: employee.password,
        role: employee.role,
        department: employee.department?.trim(),
        phone: employee.phone?.trim(),
      }))
      .filter((employee) => employee.name || employee.email || employee.password || employee.department || employee.phone);
    const uniqueEmails = new Set<string>();
    for (const employee of employees) {
      if (uniqueEmails.has(employee.email)) throw new AppError('Duplicate employee email in request.', 400);
      uniqueEmails.add(employee.email);
    }

    const duplicateEmails = await prisma.user.findMany({
      where: { email: { in: employees.map((employee) => employee.email) } },
      select: { email: true },
    });
    if (duplicateEmails.length) {
      throw new AppError(`Email already registered: ${duplicateEmails[0].email}`, 409);
    }

    const bcrypt = await import('bcryptjs');

    const createdEmployees: Array<{
      name: string;
      email: string;
      password: string;
      role: Role;
      department?: string | null;
      phone?: string | null;
    }> = [];

    let company;
    try {
      company = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { name: trimmed, director, gstNo, phone, logo },
        });

        for (const employee of employees) {
          const hashedPassword = await bcrypt.hash(employee.password, 12);
          const created = await tx.user.create({
            data: {
              name: employee.name.trim(),
              email: employee.email.trim(),
              password: hashedPassword,
              role: employee.role,
              isActive: true,
              company: trimmed,
              department: employee.department?.trim() || null,
              phone: employee.phone?.trim() || null,
            },
          });
          createdEmployees.push({
            name: created.name,
            email: created.email,
            password: employee.password,
            role: created.role,
            department: created.department,
            phone: created.phone,
          });
        }

        return company;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('Company already exists.', 409);
      }
      throw error;
    }

    if (createdEmployees.length) {
      void Promise.allSettled(
        createdEmployees.map((employee) =>
          mailService.sendWelcomeEmail({
            to: employee.email,
            name: employee.name,
            email: employee.email,
            password: employee.password,
            role: employee.role,
            company: trimmed,
            department: employee.department,
            phone: employee.phone,
          })
        )
      ).then((results) => {
        const failed = results.filter((result) => (
          result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.sent)
        ));
        if (failed.length) {
          console.warn(`[Mail] ${failed.length} company welcome email(s) failed for ${trimmed}.`);
        }
      });
    }

    return company;
  }

  async updateCompanyStatus(name: string, isActive: boolean) {
    const trimmed = name.trim();
    const company = await prisma.company.findUnique({ where: { name: trimmed } });
    if (!company) throw new AppError('Company not found.', 404);
    if (company.name === 'Platform') throw new AppError('Platform company cannot be disabled.', 400);

    const updated = await prisma.company.update({
      where: { name: trimmed },
      data: { isActive },
    });

    if (!isActive) {
      await prisma.user.updateMany({
        where: { company: trimmed, role: { not: Role.SUPER_ADMIN } },
        data: { isActive: false },
      });
    }

    return updated;
  }

  async deleteCompany(name: string) {
    const trimmed = name.trim();
    const company = await prisma.company.findUnique({ where: { name: trimmed } });
    if (!company) throw new AppError('Company not found.', 404);
    if (company.name === 'Platform') throw new AppError('Platform company cannot be deleted.', 400);

    await prisma.$transaction(async (tx) => {
      await tx.task.deleteMany({ where: { company: trimmed } });
      await tx.supportTicket.deleteMany({ where: { company: trimmed } });
      await tx.user.deleteMany({ where: { company: trimmed, role: { not: Role.SUPER_ADMIN } } });
      await tx.company.delete({ where: { name: trimmed } });
    });

    return { message: 'Company deleted successfully.' };
  }
}

export const companyService = new CompanyService();
