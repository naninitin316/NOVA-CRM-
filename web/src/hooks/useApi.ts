import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { authApi, taskApi, userApi, companyApi, progressApi, supportApi, onlineLeadApi, reminderApi } from '../api';
import { setCredentials, logout, setUser } from '../store/authSlice';
import { tokenStorage } from '../api/client';
import type { BulkLeadTaskRequest, CompanyCreateInput, LoginCredentials, TaskFilters, TaskReminderCreateInput } from '../types';
import type { OnlineLeadInput } from '../types';
import type { SupportTicketCreateInput, SupportTicketReplyInput, SupportTicketUpdateInput } from '../types';

export const useLogin = () => {
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await authApi.login(credentials);
      return data.data!;
    },
    onSuccess: async (result) => {
      await tokenStorage.set(result.token);
      dispatch(setCredentials(result));
    },
  });
};

export const useLogout = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  return () => {
    tokenStorage.remove();
    dispatch(logout());
    queryClient.clear();
  };
};

export const useTasks = (filters?: TaskFilters) =>
  useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const { data } = await taskApi.getTasks(filters);
      return data.data!;
    },
  });

export const useTask = (id: string) =>
  useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data } = await taskApi.getTask(id);
      return data.data!;
    },
    enabled: !!id,
  });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => taskApi.createTask(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

export const useCreateLeadTasks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkLeadTaskRequest) => taskApi.createLeadTasks(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      taskApi.updateTask(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useAddTaskComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { comment: string } }) =>
      taskApi.addComment(id, data),
    onSuccess: (_response, variables) => {
      qc.invalidateQueries({ queryKey: ['task', variables.id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskApi.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

export const useUsers = (enabled = true) =>
  useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await userApi.getUsers();
      return data.data!;
    },
    enabled,
  });

export const useCompanies = () =>
  useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await companyApi.getCompanies();
      return data.data!;
    },
  });

export const useCompany = (name?: string) =>
  useQuery({
    queryKey: ['company', name],
    queryFn: async () => {
      const { data } = await companyApi.getCompany(name!);
      return data.data!;
    },
    enabled: !!name,
  });

export const useCreateCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CompanyCreateInput) => companyApi.createCompany(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
};

export const useUpdateCompanyStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, isActive }: { name: string; isActive: boolean }) =>
      companyApi.updateCompanyStatus(name, isActive),
    onSuccess: (_response, variables) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['company', variables.name] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => companyApi.deleteCompany(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['company'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => userApi.createUser(data as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['company'] });
    },
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      userApi.updateUser(id, data as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['company'] });
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['company'] });
    },
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => userApi.updateProfile(data),
    onSuccess: (response) => {
      dispatch(setUser(response.data.data!));
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: authApi.changePassword,
  });

export const useAnalytics = (filters?: { company?: string; dateFrom?: string; dateTo?: string }) =>
  useQuery({
    queryKey: ['analytics', filters],
    queryFn: async () => {
      const { data } = await progressApi.getAnalytics(filters);
      return data.data!;
    },
  });

export const useSupportTickets = (status?: string, enabled = true) =>
  useQuery({
    queryKey: ['support', 'tickets', status],
    queryFn: async () => {
      const { data } = await supportApi.getTickets(status);
      return data.data!;
    },
    enabled,
    refetchInterval: 5000,
  });

export const useSupportTicket = (id?: string) =>
  useQuery({
    queryKey: ['support', 'ticket', id],
    queryFn: async () => {
      const { data } = await supportApi.getTicket(id!);
      return data.data!;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });

export const useCreateSupportTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SupportTicketCreateInput) => supportApi.createTicket(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support'] });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
};

export const useReplySupportTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupportTicketReplyInput }) => supportApi.replyTicket(id, data),
    onSuccess: (_response, variables) => {
      qc.invalidateQueries({ queryKey: ['support', 'ticket', variables.id] });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
};

export const useUpdateSupportTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupportTicketUpdateInput }) => supportApi.updateTicket(id, data),
    onSuccess: (_response, variables) => {
      qc.invalidateQueries({ queryKey: ['support', 'ticket', variables.id] });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
};

export const useOnlineLeads = (company?: string) =>
  useQuery({
    queryKey: ['online-leads', company],
    queryFn: async () => {
      const { data } = await onlineLeadApi.getLeads(company);
      return data.data!;
    },
    enabled: !!company,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

export const useCreateOnlineLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OnlineLeadInput) => onlineLeadApi.createLead(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['online-leads'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useAssignOnlineLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string }) => onlineLeadApi.assignLead(id, assignedTo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['online-leads'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useReminders = (dueOnly = false) =>
  useQuery({
    queryKey: ['reminders', dueOnly],
    queryFn: async () => {
      const { data } = await reminderApi.getReminders(dueOnly);
      return data.data!;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

export const useCreateReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TaskReminderCreateInput) => reminderApi.createReminder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};

export const useDismissReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reminderApi.dismissReminder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};
