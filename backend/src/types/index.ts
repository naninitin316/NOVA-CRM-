import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
    isActive?: boolean;
    company?: string | null;
    department?: string | null;
  };
}

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFilters extends PaginationParams {
  search?: string;
  status?: string;
  priority?: string;
  department?: string;
  assignedTo?: string;
  company?: string;
  dateFrom?: string;
  dateTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

export interface SupportTicketSummary {
  id: string;
  subject: string;
  company?: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
    company?: string | null;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  latestMessage?: {
    id: string;
    body: string;
    createdAt: Date;
    sender: {
      id: string;
      name: string;
      role: string;
    };
  } | null;
  messageCount?: number;
}

export interface SupportMessageItem {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    role: string;
    company?: string | null;
  };
}

export interface SupportTicketDetail extends SupportTicketSummary {
  messages: SupportMessageItem[];
}

export interface CompanySummary {
  id: string;
  name: string;
  director?: string | null;
  gstNo?: string | null;
  phone?: string | null;
  userCount?: number;
  activeUserCount?: number;
  adminCount?: number;
  memberCount?: number;
  contributorCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CompanyDetail extends CompanySummary {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    company?: string | null;
    department?: string | null;
    phone?: string | null;
    createdAt: Date;
  }>;
  taskCount?: number;
  processedTaskCount?: number;
  rejectedTaskCount?: number;
  onHoldTaskCount?: number;
  recentTasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    department?: string | null;
    createdAt: Date;
    updatedAt: Date;
    assignee?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    description?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    customerCompany?: string | null;
    customerSource?: string | null;
    company?: string | null;
    status: string;
    priority: string;
    department?: string | null;
    remarks?: string | null;
    dueDate?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    assignee?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
}

export interface CompanyEmployeeInput {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'MEMBER' | 'CONTRIBUTOR' | 'VIEWER';
  isActive?: boolean;
  department?: string;
  phone?: string;
}

export interface CompanyCreateInput {
  name: string;
  director: string;
  gstNo: string;
  phone: string;
  logo?: string;
  employees?: CompanyEmployeeInput[];
}
