export const colors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  secondary: '#0EA5E9',
  accent: '#8B5CF6',

  background: '#0F172A',
  backgroundLight: '#1E293B',
  surface: '#1E293B',
  surfaceLight: '#334155',
  card: 'rgba(30, 41, 59, 0.8)',

  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoLight: 'rgba(59, 130, 246, 0.15)',

  border: 'rgba(148, 163, 184, 0.15)',
  borderLight: 'rgba(148, 163, 184, 0.08)',

  glass: 'rgba(30, 41, 59, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',

  white: '#FFFFFF',
  black: '#000000',

  gradient: {
    primary: ['#6366F1', '#8B5CF6', '#0EA5E9'] as const,
    dark: ['#0F172A', '#1E293B', '#0F172A'] as const,
    card: ['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)'] as const,
  },
};

export const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  PROCESSED: { bg: colors.successLight, text: colors.success, label: 'Processed' },
  REJECTED: { bg: colors.errorLight, text: colors.error, label: 'Rejected' },
  ON_HOLD: { bg: colors.warningLight, text: colors.warning, label: 'On Hold' },
};

export const priorityColors: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'rgba(100, 116, 139, 0.15)', text: '#94A3B8' },
  MEDIUM: { bg: colors.infoLight, text: colors.info },
  HIGH: { bg: colors.warningLight, text: colors.warning },
  URGENT: { bg: colors.errorLight, text: colors.error },
};

export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  CONTRIBUTOR: 'Contributor',
  VIEWER: 'Viewer',
  SALES_TEAM: 'Sales Team',
  HR_TEAM: 'HR Team',
};

export const roleColors: Record<string, string> = {
  SUPER_ADMIN: '#F59E0B',
  ADMIN: '#8B5CF6',
  MEMBER: '#0EA5E9',
  CONTRIBUTOR: '#10B981',
  VIEWER: '#64748B',
  SALES_TEAM: '#0EA5E9',
  HR_TEAM: '#10B981',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};
