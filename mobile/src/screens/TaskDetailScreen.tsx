import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography, statusColors, priorityColors } from '../theme';
import { Badge, LoadingScreen, Card, Button } from '../components/ui';
import { useTask } from '../hooks/useApi';

interface TaskDetailScreenProps {
  taskId: string;
  onBack: () => void;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ taskId, onBack }) => {
  const { data: task, isLoading } = useTask(taskId);

  if (isLoading) return <LoadingScreen />;
  if (!task) return <View style={styles.container}><Text style={styles.error}>Task not found</Text></View>;

  const status = statusColors[task.status];
  const priority = priorityColors[task.priority];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Button title="← Back to Tasks" variant="ghost" onPress={onBack} style={styles.backBtn} />

      <Card style={styles.header}>
        <Text style={styles.title}>{task.title}</Text>
        <View style={styles.badges}>
          <Badge label={status.label} color={status.text} bgColor={status.bg} />
          <Badge label={task.priority} color={priority.text} bgColor={priority.bg} />
          {task.department && <Badge label={task.department} color={colors.secondary} />}
        </View>
      </Card>

      {task.description && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{task.description}</Text>
        </Card>
      )}

      <View style={styles.detailsGrid}>
        <Card style={styles.detailCard}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
          <Text style={styles.detailLabel}>Assigned To</Text>
          <Text style={styles.detailValue}>{task.assignee?.name || 'Unassigned'}</Text>
        </Card>
        <Card style={styles.detailCard}>
          <Ionicons name="calendar-outline" size={20} color={colors.warning} />
          <Text style={styles.detailLabel}>Due Date</Text>
          <Text style={styles.detailValue}>
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
          </Text>
        </Card>
        <Card style={styles.detailCard}>
          <Ionicons name="time-outline" size={20} color={colors.textMuted} />
          <Text style={styles.detailLabel}>Created</Text>
          <Text style={styles.detailValue}>{new Date(task.createdAt).toLocaleDateString()}</Text>
        </Card>
        <Card style={styles.detailCard}>
          <Ionicons name="finger-print-outline" size={20} color={colors.textMuted} />
          <Text style={styles.detailLabel}>Task ID</Text>
          <Text style={styles.detailValueSmall}>{task.id.slice(0, 8)}...</Text>
        </Card>
      </View>

      {task.remarks && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Remarks</Text>
          <Text style={styles.description}>{task.remarks}</Text>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 16 },
  header: { marginBottom: 16 },
  title: { ...typography.h2, color: colors.text, marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  section: { marginBottom: 16 },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: 8 },
  description: { ...typography.body, color: colors.text },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  detailCard: { flex: 1, minWidth: 150, alignItems: 'center', gap: 6, paddingVertical: 20 },
  detailLabel: { ...typography.caption, color: colors.textMuted },
  detailValue: { ...typography.h4, color: colors.text },
  detailValueSmall: { ...typography.bodySmall, color: colors.text, fontFamily: 'monospace' },
  error: { color: colors.error, textAlign: 'center', marginTop: 40 },
});
