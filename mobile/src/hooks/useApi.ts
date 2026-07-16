import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, taskApi, userApi, progressApi } from '../api';
import { TaskFilters, LoginCredentials } from '../types';
import { useDispatch } from 'react-redux';
import { setCredentials, logout, setUser } from '../store/authSlice';
import { tokenStorage } from '../api/client';

// Auth hooks
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
  return async () => {
    await tokenStorage.remove();
    dispatch(logout());
    queryClient.clear();
  };
};

export const useProfile = () => {
  const dispatch = useDispatch();
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await authApi.getProfile();
      dispatch(setUser(data.data!));
      return data.data!;
    },
  });
};

// Task hooks
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      taskApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskApi.deleteTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

// User hooks
export const useUsers = () =>
  useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await userApi.getUsers();
      return data.data!;
    },
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      userApi.updateUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userApi.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (response) => {
      dispatch(setUser(response.data.data!));
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: authApi.changePassword,
  });

// Analytics hooks
export const useAnalytics = () =>
  useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data } = await progressApi.getAnalytics();
      return data.data!;
    },
  });
