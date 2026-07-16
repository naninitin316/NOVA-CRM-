import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { tokenStorage } from './src/api/client';
import { useDispatch } from 'react-redux';
import { setCredentials, setLoading } from './src/store/authSlice';
import { authApi } from './src/api';
import { colors } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

/** Bootstrap auth state from stored token */
const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await tokenStorage.get();
        if (token) {
          const { data } = await authApi.getProfile();
          if (data.data) {
            dispatch(setCredentials({ user: data.data, token }));
            return;
          }
        }
      } catch {
        await tokenStorage.remove();
      }
      dispatch(setLoading(false));
    };
    initAuth();
  }, [dispatch]);

  return <>{children}</>;
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthBootstrap>
            <StatusBar style="light" />
            <AppNavigator />
          </AuthBootstrap>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
