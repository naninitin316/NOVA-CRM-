import { Role, SupportStatus } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../utils/errorHandler';
import { isSupportRole } from '../utils/permissions';
import type { SupportTicketDetail, SupportTicketSummary } from '../types';

type TicketFilter = {
  status?: SupportStatus;
};

const SUPPORT_INCLUDE = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: true,
    },
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      id: true,
      body: true,
      createdAt: true,
      sender: {
        select: {
          id: true,
          name: true,
          role: true,
          company: true,
        },
      },
    },
  },
  _count: {
    select: { messages: true },
  },
} as const;

const SUPPORT_DETAIL_INCLUDE = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: true,
    },
  },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      body: true,
      isInternal: true,
      createdAt: true,
      sender: {
        select: {
          id: true,
          name: true,
          role: true,
          company: true,
        },
      },
    },
  },
  _count: {
    select: { messages: true },
  },
} as const;

export class SupportService {
  private canAccessTicket(role: Role, userId: string, company: string | null | undefined, ticket: { createdById: string; company: string | null; assignedToId: string | null }) {
    if (isSupportRole(role)) return true;
    if (ticket.createdById === userId) return true;
    return false;
  }

  async getTickets(role: Role, userId: string, company?: string | null, filter?: TicketFilter) {
    const where =
      isSupportRole(role)
        ? {
            ...(filter?.status ? { status: filter.status } : {}),
          }
        : {
            createdById: userId,
            ...(filter?.status ? { status: filter.status } : {}),
          };

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: SUPPORT_INCLUDE,
    });

    return tickets.map((ticket) => this.toSummary(ticket)) as SupportTicketSummary[];
  }

  async getTicketById(id: string, role: Role, userId: string, company?: string | null) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: SUPPORT_DETAIL_INCLUDE,
    });
    if (!ticket) throw new AppError('Support ticket not found.', 404);
    if (!this.canAccessTicket(role, userId, company, ticket)) {
      throw new AppError('Access denied.', 403);
    }
    return this.toDetail(ticket) as SupportTicketDetail;
  }

  async createTicket(data: { subject: string; message: string }, user: { id: string; company?: string | null; role: Role }) {
    const subject = data.subject?.trim();
    const message = data.message?.trim();
    if (!subject) throw new AppError('Subject is required.', 400);
    if (!message) throw new AppError('Message is required.', 400);

    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        company: user.company?.trim() || null,
        createdById: user.id,
        status: SupportStatus.OPEN,
        messages: {
          create: {
            senderId: user.id,
            body: message,
          },
        },
      },
      include: SUPPORT_DETAIL_INCLUDE,
    });
    return this.toDetail(ticket) as SupportTicketDetail;
  }

  async replyToTicket(id: string, user: { id: string; role: Role; company?: string | null }, message: string) {
    const cleanMessage = message?.trim();
    if (!cleanMessage) throw new AppError('Message is required.', 400);

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new AppError('Support ticket not found.', 404);
    if (!this.canAccessTicket(user.role, user.id, user.company, ticket)) {
      throw new AppError('Access denied.', 403);
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: isSupportRole(user.role) ? SupportStatus.IN_PROGRESS : ticket.status === SupportStatus.CLOSED ? SupportStatus.OPEN : ticket.status,
        assignedToId: isSupportRole(user.role) ? (ticket.assignedToId || user.id) : ticket.assignedToId,
        messages: {
          create: {
            senderId: user.id,
            body: cleanMessage,
          },
        },
      },
      include: SUPPORT_DETAIL_INCLUDE,
    });

    return this.toDetail(updated) as SupportTicketDetail;
  }

  async updateTicket(
    id: string,
    user: { id: string; role: Role; company?: string | null },
    data: { status?: SupportStatus; assignedToId?: string | null }
  ) {
    if (!isSupportRole(user.role)) {
      throw new AppError('Access denied.', 403);
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new AppError('Support ticket not found.', 404);

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId || null } : {}),
      },
      include: SUPPORT_DETAIL_INCLUDE,
    });

    return this.toDetail(updated) as SupportTicketDetail;
  }

  private toSummary(ticket: any): SupportTicketSummary {
    const messages = ticket.messages || [];
    const latest = messages[messages.length - 1];
    const latestMessage = latest
      ? {
          id: latest.id,
          body: latest.body,
          createdAt: latest.createdAt,
          sender: latest.sender,
        }
      : null;

    return {
      id: ticket.id,
      subject: ticket.subject,
      company: ticket.company,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      createdBy: ticket.createdBy,
      assignedTo: ticket.assignedTo,
      latestMessage,
      messageCount: ticket._count?.messages || 0,
    };
  }

  private toDetail(ticket: any): SupportTicketDetail {
    return {
      ...this.toSummary(ticket),
      messages: (ticket.messages || []).map((message: any) => ({
        id: message.id,
        body: message.body,
        isInternal: message.isInternal,
        createdAt: message.createdAt,
        sender: message.sender,
      })),
    };
  }
}

export const supportService = new SupportService();
