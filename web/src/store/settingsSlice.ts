import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'crm-theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

interface SettingsState {
  theme: ThemeMode;
  notifications: {
    email: boolean;
    push: boolean;
    taskUpdates: boolean;
    weeklyReport: boolean;
  };
}

const initialState: SettingsState = {
  theme: getInitialTheme(),
  notifications: {
    email: true,
    push: true,
    taskUpdates: true,
    weeklyReport: false,
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
    },
    toggleNotification: (state, action: PayloadAction<keyof SettingsState['notifications']>) => {
      state.notifications[action.payload] = !state.notifications[action.payload];
    },
  },
});

export const { setTheme, toggleNotification } = settingsSlice.actions;
export default settingsSlice.reducer;
