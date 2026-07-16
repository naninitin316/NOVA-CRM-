import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme, type ThemeMode } from '@/store/settingsSlice';
import type { RootState } from '@/store';

const THEME_KEY = 'crm-theme';

export function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

/** Sync Redux theme to DOM + localStorage */
export function useTheme() {
  const theme = useSelector((s: RootState) => s.settings.theme);
  const dispatch = useDispatch();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return {
    theme,
    isDark: theme === 'dark',
    setTheme: (mode: ThemeMode) => dispatch(setTheme(mode)),
    toggleTheme: () => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark')),
  };
}
