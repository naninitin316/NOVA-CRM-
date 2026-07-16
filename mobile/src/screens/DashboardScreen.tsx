import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { colors, typography, roleLabels } from '../theme';
import { StatCard, LoadingScreen, Card } from '../components/ui';
import { TaskTable } from '../components/tasks';
import { useAnalytics, useTasks } from '../hooks/useApi';
import { RootState } from '../store';
import { Task } from '../types';

interface DashboardScreenProps {
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (analyticsLoading) return <LoadingScreen />;

  const overview = analytics?.overview;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome header */}
      <View style={styles.welcome}>
        <Text style={styles.greeting}>Good {getGreeting()}, {user?.name?.split(' ')[0]}</Text>
        <Text style={styles.subGreeting}>
          {roleLabels[user?.role || 'SALES_TEAM']} Dashboard · Here's your overview
        </Text>
      </View>

      {/* Stats grid */}
      <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
        <StatCard
          title="Total Tasks"
          value={overview?.total || 0}
          color={colors.primary}
          icon={<Ionicons name="layers" size={20} color={colors.primary} />}
        />
        <StatCard
          title="Processed"
          value={overview?.processed || 0}
          color={colors.success}
          icon={<Ionicons name="checkmark-circle" size={20} color={colors.success} />}
        />
        <StatCard
          title="On Hold"
          value={overview?.onHold || 0}
          color={colors.warning}
          icon={<Ionicons name="pause-circle" size={20} color={colors.warning} />}
        />
        <StatCard
          title="Completion"
          value={`${overview?.completionPercentage || 0}%`}
          color={colors.secondary}
          icon={<Ionicons name="trending-up" size={20} color={colors.secondary} />}
        />
      </View>

      {/* Quick actions */}
      <View style={[styles.actionsRow, isMobile && styles.actionsRowMobile]}>
        <Card style={styles.actionCard} onPress={() => onNavigate('Tasks')}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
          <Text style={styles.actionTitle}>View Tasks</Text>
          <Text style={styles.actionSub}>Manage all tasks</Text>
        </Card>
        <Card style={styles.actionCard} onPress={() => onNavigate('Progress')}>
          <Ionicons name="analytics" size={28} color={colors.secondary} />
          <Text style={styles.actionTitle}>Analytics</Text>
          <Text style={styles.actionSub}>View performance</Text>
        </Card>
        <Card style={styles.actionCard} onPress={() => onNavigate('Settings')}>
          <Ionicons name="settings" size={28} color={colors.accent} />
          <Text style={styles.actionTitle}>Settings</Text>
          <Text style={styles.actionSub}>Profile & preferences</Text>
        </Card>
      </View>

      {/* Recent tasks */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
          <Text style={styles.seeAll} onPress={() => onNavigate('Tasks')}>See all →</Text>
        </View>
        {tasksLoading ? (
          <LoadingScreen />
        ) : (
          <TaskTable
            tasks={tasksData?.tasks || []}
            onPress={(task: Task) => onNavigate('TaskDetail', { taskId: task.id })}
          />
        )}
      </View>
    </ScrollView>
  );
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  welcome: { marginBottom: 24 },
  greeting: { ...typography.h2, color: colors.text },
  subGreeting: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  statsGridMobile: { flexDirection: 'column' },
  actionsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  actionsRowMobile: { flexDirection: 'column' },
  actionCard: { flex: 1, alignItems: 'center', paddingVertical: 24, gap: 8 },
  actionTitle: { ...typography.h4, color: colors.text },
  actionSub: { ...typography.caption, color: colors.textMuted },
  recentSection: { marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { ...typography.h3, color: colors.text },
  seeAll: { color: colors.primary, fontWeight: '500' },
});
