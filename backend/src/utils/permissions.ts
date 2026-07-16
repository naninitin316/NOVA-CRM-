import { Role } from '@prisma/client';

/** Role-based permission definitions */
export const permissions = {
  [Role.SUPER_ADMIN]: {
    tasks: ['create', 'read', 'update', 'delete', 'assign'],
    users: ['create', 'read', 'update', 'delete'],
    progress: ['read', 'create'],
    support: ['read', 'create', 'update'],
    settings: ['read', 'update'],
    departments: ['create', 'read', 'update', 'delete'],
  },
  [Role.ADMIN]: {
    tasks: ['create', 'read', 'update', 'delete', 'assign'],
    users: ['create', 'read', 'update', 'delete'],
    progress: ['read', 'create'],
    support: ['read'],
    settings: ['read', 'update'],
    departments: ['create', 'read', 'update', 'delete'],
  },
  [Role.MEMBER]: {
    tasks: ['create', 'read', 'update', 'assign'],
    users: ['read'],
    progress: ['read', 'create'],
    support: ['read'],
    settings: ['read', 'update'],
    departments: ['read'],
  },
  [Role.CONTRIBUTOR]: {
    tasks: ['create', 'read', 'update'],
    users: ['read'],
    progress: ['read', 'create'],
    support: ['read', 'create'],
    settings: ['read', 'update'],
    departments: ['read'],
  },
  [Role.VIEWER]: {
    tasks: ['read'],
    users: [],
    progress: ['read'],
    support: ['read', 'create'],
    settings: ['read', 'update'],
    departments: [],
  },
  [Role.SUPPORT]: {
    tasks: ['read'],
    users: ['read'],
    progress: ['read'],
    support: ['read', 'update'],
    settings: ['read', 'update'],
    departments: ['read'],
  },
  [Role.SALES_TEAM]: {
    tasks: ['read', 'update'],
    users: ['read'],
    progress: ['read', 'create'],
    support: ['read', 'create'],
    settings: ['read', 'update'],
    departments: ['read'],
  },
  [Role.HR_TEAM]: {
    tasks: ['read', 'update'],
    users: ['read'],
    progress: ['read', 'create'],
    support: ['read', 'create'],
    settings: ['read', 'update'],
    departments: ['read'],
  },
} as const;

export type Resource = 'tasks' | 'users' | 'progress' | 'support' | 'settings' | 'departments';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'assign';

export const hasPermission = (role: Role, resource: Resource, action: Action): boolean => {
  const rolePermissions = permissions[role];
  if (!rolePermissions) return false;
  const resourcePermissions = rolePermissions[resource];
  return (resourcePermissions as readonly string[])?.includes(action) ?? false;
};

/** Departments visible per role */
export const getDepartmentFilter = (role: Role, userDepartment?: string | null): string | undefined => {
  if (role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.MEMBER) return undefined;
  if (role === Role.CONTRIBUTOR) return userDepartment || undefined;
  if (role === Role.VIEWER) return undefined;
  if (role === Role.HR_TEAM) return 'HR';
  if (role === Role.SALES_TEAM) return userDepartment || 'Sales';
  return undefined;
};

export const canManageUserStatus = (role: Role) => role === Role.SUPER_ADMIN || role === Role.ADMIN;
export const isSupportRole = (role: Role) => role === Role.SUPPORT || role === Role.SUPER_ADMIN;
