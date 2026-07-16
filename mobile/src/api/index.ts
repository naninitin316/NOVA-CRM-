import api from './client';
import {
  User,
  Task,
  TaskListResponse,
  Analytics,
  LoginCredentials,
  TaskFilters,
  ApiResponse,
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

  updateTask: (id: string, data: Partial<Task>) =>
    api.put<ApiResponse<Task>>(`/tasks/${id}`, data),

  deleteTask: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/tasks/${id}`),

  assignTask: (id: string, assignedTo: string) =>
    api.patch<ApiResponse<Task>>(`/tasks/${id}/assign`, { assignedTo }),
};

export const userApi = {
  getUsers: () => api.get<ApiResponse<User[]>>('/users'),

  getUser: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),

  createUser: (data: Partial<User> & { password: string }) =>
    api.post<ApiResponse<User>>('/users', data),

  updateUser: (id: string, data: Partial<User>) =>
    api.put<ApiResponse<User>>(`/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/users/${id}`),

  updateProfile: (data: Partial<User>) =>
    api.put<ApiResponse<User>>('/users/profile', data),
};

export const progressApi = {
  getAnalytics: () => api.get<ApiResponse<Analytics>>('/progress/analytics'),

  getLogs: (taskId: string) => api.get(`/progress/logs/${taskId}`),
};
