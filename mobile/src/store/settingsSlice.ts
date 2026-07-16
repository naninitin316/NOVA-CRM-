import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ThemeMode = 'dark' | 'light';

interface SettingsState {
  theme: ThemeMode;
  notifications: {
    email: boolean;
    push: boolean;
    taskUpdates: boolean;
    weeklyReport: boolean;
  };
  sidebarCollapsed: boolean;
}

const initialState: SettingsState = {
  theme: 'dark',
  notifications: {
    email: true,
    push: true,
    taskUpdates: true,
    weeklyReport: false,
  },
  sidebarCollapsed: false,
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
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const { setTheme, toggleNotification, toggleSidebar } = settingsSlice.actions;
export default settingsSlice.reducer;
