import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { colors, borderRadius } from '../theme';
import { Sidebar, TopBar } from '../components/layout';
import { RootState } from '../store';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';

type Screen = 'Dashboard' | 'Tasks' | 'Progress' | 'Settings' | 'TaskDetail';

const mobileNavItems = [
  { key: 'Dashboard' as Screen, icon: 'grid-outline' as const, label: 'Home' },
  { key: 'Tasks' as Screen, icon: 'checkbox-outline' as const, label: 'Tasks' },
  { key: 'Progress' as Screen, icon: 'bar-chart-outline' as const, label: 'Progress' },
  { key: 'Settings' as Screen, icon: 'settings-outline' as const, label: 'Settings' },
];

export const AppNavigator: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const sidebarCollapsed = useSelector((state: RootState) => state.settings.sidebarCollapsed);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeScreen, setActiveScreen] = useState<Screen>('Dashboard');
  const [screenParams, setScreenParams] = useState<Record<string, unknown>>({});

  if (isLoading) return null;
  if (!isAuthenticated) return <LoginScreen />;

  const navigate = (screen: string, params?: Record<string, unknown>) => {
    setActiveScreen(screen as Screen);
    if (params) setScreenParams(params);
    else setScreenParams({});
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'Dashboard':
        return <DashboardScreen onNavigate={navigate} />;
      case 'Tasks':
        return <TasksScreen onNavigate={navigate} />;
      case 'Progress':
        return <ProgressScreen />;
      case 'Settings':
        return <SettingsScreen />;
      case 'TaskDetail':
        return (
          <TaskDetailScreen
            taskId={screenParams.taskId as string}
            onBack={() => navigate('Tasks')}
          />
        );
      default:
        return <DashboardScreen onNavigate={navigate} />;
    }
  };

  const screenTitles: Record<Screen, string> = {
    Dashboard: 'Dashboard',
    Tasks: 'Task Management',
    Progress: 'Progress Analytics',
    Settings: 'Settings',
    TaskDetail: 'Task Details',
  };

  if (isMobile) {
    const showBottomNav = activeScreen !== 'TaskDetail';
    return (
      <View style={styles.mobileContainer}>
        <TopBar title={screenTitles[activeScreen]} />
        <View style={styles.mobileContent}>{renderScreen()}</View>
        {showBottomNav && (
          <View style={styles.bottomNav}>
            {mobileNavItems.map((item) => {
              const isActive = activeScreen === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.bottomNavItem}
                  onPress={() => navigate(item.key)}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isActive ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.bottomNavLabel, isActive && styles.bottomNavLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Sidebar
        activeRoute={activeScreen === 'TaskDetail' ? 'Tasks' : activeScreen}
        onNavigate={(route) => navigate(route)}
        collapsed={sidebarCollapsed}
      />
      <View style={styles.main}>
        <TopBar title={screenTitles[activeScreen]} />
        <View style={styles.content}>{renderScreen()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
    ...Platform.select({ web: { height: '100vh' as unknown as number } }),
  },
  main: { flex: 1 },
  content: { flex: 1 },
  mobileContainer: { flex: 1, backgroundColor: colors.background },
  mobileContent: { flex: 1 },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  bottomNavItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  bottomNavLabel: { fontSize: 11, color: colors.textMuted },
  bottomNavLabelActive: { color: colors.primary, fontWeight: '600' },
});
