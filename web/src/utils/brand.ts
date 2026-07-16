import type { User } from '@/types';

export const getBrandLabel = (user?: Pick<User, 'role' | 'company'> | null) => {
  if (!user || user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT') return 'NOVA CRM';
  if (user.company?.trim()) return `${user.company.trim()} CRM`;
  return 'CRM';
};
