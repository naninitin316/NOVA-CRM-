import api from './client';
import type {
  User, Task, TaskComment, TaskListResponse, Analytics,
  LoginCredentials, TaskFilters, ApiResponse, BulkLeadTaskRequest,
  Company, CompanyDetail, CompanyCreateInput,
  OnlineLeadInput,
  TaskReminder, TaskReminderCreateInput,
  SupportTicketSummary, SupportTicketDetail, SupportTicketCreateInput, SupportTicketReplyInput, SupportTicketUpdateInput,
} from '../types';

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', credentials),
  getProfile: () => api.get<ApiResponse<User>>('/auth/profile'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<ApiResponse<{ message: string }>>('/auth/change-password', data),
};

export const taskApi = {
  getTasks: (filters?: TaskFilters) =>
    api.get<ApiResponse<TaskListResponse>>('/tasks', { params: filters }),
  getTask: (id: string) => api.get<ApiResponse<Task>>(`/tasks/${id}`),
  createTask: (data: Partial<Task>) => api.post<ApiResponse<Task>>('/tasks', data),
  createLeadTasks: (data: BulkLeadTaskRequest) =>
    api.post<ApiResponse<{ created: number; skipped?: number; tasks: Task[] }>>('/tasks/bulk-leads', data),
  updateTask: (id: string, data: Partial<Task>) =>
    api.put<ApiResponse<Task>>(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/tasks/${id}`),
  assignTask: (id: string, assignedTo: string) =>
    api.patch<ApiResponse<Task>>(`/tasks/${id}/assign`, { assignedTo }),
  addComment: (id: string, data: { comment: string }) =>
    api.post<ApiResponse<TaskComment>>(`/tasks/${id}/comments`, data),
};

export const userApi = {
  getUsers: () => api.get<ApiResponse<User[]>>('/users'),
  createUser: (data: Partial<User> & { password: string }) =>
    api.post<ApiResponse<User>>('/users', data),
  updateUser: (id: string, data: Partial<User>) =>
    api.put<ApiResponse<User>>(`/users/${id}`, data),
  deleteUser: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/users/${id}`),
  updateProfile: (data: Partial<User>) =>
    api.put<ApiResponse<User>>('/users/profile', data),
};

export const companyApi = {
  getCompanies: () => api.get<ApiResponse<Company[]>>('/companies'),
  getCompany: (name: string) => api.get<ApiResponse<CompanyDetail>>(`/companies/${encodeURIComponent(name)}`),
  createCompany: (data: CompanyCreateInput) => api.post<ApiResponse<Company>>('/companies', data),
  updateCompanyStatus: (name: string, isActive: boolean) =>
    api.patch<ApiResponse<Company>>(`/companies/${encodeURIComponent(name)}/status`, { isActive }),
  deleteCompany: (name: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/companies/${encodeURIComponent(name)}`),
};

export const progressApi = {
  getAnalytics: (filters?: { company?: string; dateFrom?: string; dateTo?: string }) =>
    api.get<ApiResponse<Analytics>>('/progress/analytics', { params: filters }),
};

export const supportApi = {
  getTickets: (status?: string) =>
    api.get<ApiResponse<SupportTicketSummary[]>>('/support/tickets', { params: status ? { status } : undefined }),
  getTicket: (id: string) =>
    api.get<ApiResponse<SupportTicketDetail>>(`/support/tickets/${id}`),
  createTicket: (data: SupportTicketCreateInput) =>
    api.post<ApiResponse<SupportTicketDetail>>('/support/tickets', data),
  replyTicket: (id: string, data: SupportTicketReplyInput) =>
    api.post<ApiResponse<SupportTicketDetail>>(`/support/tickets/${id}/messages`, data),
  updateTicket: (id: string, data: SupportTicketUpdateInput) =>
    api.patch<ApiResponse<SupportTicketDetail>>(`/support/tickets/${id}`, data),
};

export const reminderApi = {
  getReminders: (due?: boolean) =>
    api.get<ApiResponse<TaskReminder[]>>('/reminders', { params: due ? { due: true } : undefined }),
  createReminder: (data: TaskReminderCreateInput) =>
    api.post<ApiResponse<TaskReminder>>('/reminders', data),
  dismissReminder: (id: string) =>
    api.patch<ApiResponse<TaskReminder>>(`/reminders/${id}/dismiss`),
};

export const onlineLeadApi = {
  createLead: (data: OnlineLeadInput) =>
    api.post<ApiResponse<Task>>('/online-leads', data),
  getLeads: (company?: string) =>
    api.get<ApiResponse<Task[]>>('/online-leads', { params: company ? { company } : undefined }),
  assignLead: (id: string, assignedTo: string) =>
    api.patch<ApiResponse<Task>>(`/online-leads/${id}/assign`, { assignedTo }),
};
