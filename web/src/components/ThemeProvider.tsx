import { useTheme } from '@/hooks/useTheme';

/** Applies theme from Redux on app mount */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useTheme();
  return <>{children}</>;
}
