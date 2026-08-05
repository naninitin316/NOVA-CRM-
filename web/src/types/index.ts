export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'CONTRIBUTOR' | 'VIEWER' | 'SUPPORT' | 'SALES_TEAM' | 'HR_TEAM';
export type TaskStatus = 'PROCESSED' | 'REJECTED' | 'ON_HOLD';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  company?: string;
  department?: string;
  phone?: string;
  profileImage?: string;
  createdAt?: string;
}

export interface Company {
  id: string;
  name: string;
  director?: string | null;
  gstNo?: string | null;
  phone?: string | null;
  logo?: string | null;
  isActive?: boolean;
  userCount?: number;
  activeUserCount?: number;
  adminCount?: number;
  memberCount?: number;
  contributorCount?: number;
  createdAt?: string;
  updatedAt?: string;
  taskCount?: number;
  processedTaskCount?: number;
  rejectedTaskCount?: number;
  onHoldTaskCount?: number;
}

export interface CompanyDetail extends Company {
  users: User[];
  tasks?: Task[];
  recentTasks?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    priority: Priority;
    department?: string;
    createdAt: string;
    updatedAt: string;
    assignee?: Pick<User, 'id' | 'name' | 'email'>;
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

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  comment: string;
  commentDate: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'name'>;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerSource?: string;
  company?: string;
  assignedTo?: string;
  status: TaskStatus;
  priority: Priority;
  department?: string;
  remarks?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  assignee?: Pick<User, 'id' | 'name' | 'email' | 'department'>;
  comments?: TaskComment[];
  progress?: Array<{
    id: string;
    taskId: string;
    updatedBy: string;
    status: TaskStatus;
    remarks?: string | null;
    updatedAt: string;
    updater?: Pick<User, 'id' | 'name'>;
  }>;
}

export interface TaskReminder {
  id: string;
  taskId: string;
  userId: string;
  remindAt: string;
  note?: string | null;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
  task: Pick<Task, 'id' | 'title' | 'status' | 'priority' | 'customerName' | 'company'>;
}

export interface TaskReminderCreateInput {
  taskId: string;
  remindAt: string;
  note?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TaskListResponse {
  tasks: Task[];
  pagination: Pagination;
}

export interface LeadTaskInput {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerSource?: string;
  description?: string;
  remarks?: string;
  assignedTo?: string;
}

export interface BulkLeadTaskRequest {
  assignmentMode: 'ROUND_ROBIN' | 'MANUAL';
  department: 'Sales' | 'HR' | 'IT' | 'Administration' | 'Finance' | 'Engineering' | 'Marketing' | 'Support';
  assigneeIds?: string[];
  priority?: Priority;
  dueDate?: string;
  leads: LeadTaskInput[];
}

export interface Analytics {
  overview: {
    total: number;
    processed: number;
    rejected: number;
    onHold: number;
    completionPercentage: number;
  };
  monthlyPerformance: {
    month: string;
    processed: number;
    rejected: number;
    onHold: number;
    total: number;
  }[];
  statusDistribution: { status: string; count: number; color: string }[];
  departmentPerformance: {
    department: string;
    total: number;
    processed: number;
    percentage: number;
  }[];
  teamPerformance: {
    name: string;
    total: number;
    processed: number;
    percentage: number;
  }[];
  priorityDistribution: { priority: string; count: number }[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface TaskFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus;
  priority?: Priority;
  department?: string;
  assignedTo?: string;
  company?: string;
  dateFrom?: string;
  dateTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CompanyFilters {
  company?: string;
}

export interface OnlineLeadInput {
  company: string;
  name?: string;
  phone?: string;
  email?: string;
  project?: string;
  message?: string;
  source?: string;
}

export interface SupportUserRef {
  id: string;
  name: string;
  email: string;
  role: Role;
  company?: string | null;
}

export interface SupportMessageItem {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  sender: SupportUserRef;
}

export interface SupportTicketSummary {
  id: string;
  subject: string;
  company?: string | null;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: SupportUserRef;
  assignedTo?: SupportUserRef | null;
  latestMessage?: Omit<SupportMessageItem, 'isInternal'> | null;
  messageCount?: number;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  messages: SupportMessageItem[];
}

export interface SupportTicketCreateInput {
  subject: string;
  message: string;
}

export interface SupportTicketReplyInput {
  message: string;
}

export interface SupportTicketUpdateInput {
  status?: SupportStatus;
  assignedToId?: string | null;
}
