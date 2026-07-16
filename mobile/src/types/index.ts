export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'CONTRIBUTOR' | 'VIEWER' | 'SALES_TEAM' | 'HR_TEAM';
export type TaskStatus = 'PROCESSED' | 'REJECTED' | 'ON_HOLD';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company?: string;
  department?: string;
  phone?: string;
  profileImage?: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  company?: string;
  status: TaskStatus;
  priority: Priority;
  department?: string;
  remarks?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  assignee?: Pick<User, 'id' | 'name' | 'email' | 'department'>;
}

export interface ProgressLog {
  id: string;
  taskId: string;
  updatedBy: string;
  status: TaskStatus;
  remarks?: string;
  updatedAt: string;
  updater?: Pick<User, 'id' | 'name'>;
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
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
