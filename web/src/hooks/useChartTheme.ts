import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

export function useChartTheme() {
  const theme = useSelector((s: RootState) => s.settings.theme);
  const isDark = theme === 'dark';

  return {
    tooltipStyle: {
      background: isDark ? '#18181b' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 10,
      boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.08)',
      fontSize: 13,
    },
    axisColor: isDark ? '#71717a' : '#a1a1aa',
    gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  };
}
