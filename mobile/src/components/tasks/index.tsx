import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography, statusColors, priorityColors } from '../theme';
import { Task, TaskStatus, Priority } from '../types';
import { Badge } from './ui';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onPress,
  onEdit,
  onDelete,
  showActions,
}) => {
  const status = statusColors[task.status];
  const priority = priorityColors[task.priority];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{task.title}</Text>
          <Badge label={status.label} color={status.text} bgColor={status.bg} />
        </View>
        <View style={styles.cardMeta}>
          <Badge label={task.priority} color={priority.text} bgColor={priority.bg} />
          {task.department && (
            <Text style={styles.department}>{task.department}</Text>
          )}
        </View>
      </View>

      {task.description && (
        <Text style={styles.description} numberOfLines={2}>{task.description}</Text>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.assignee}>
          <Ionicons name="person-outline" size={14} color={colors.textMuted} />
          <Text style={styles.assigneeText}>
            {task.assignee?.name || 'Unassigned'}
          </Text>
        </View>
        {task.dueDate && (
          <View style={styles.dueDate}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.dueDateText}>
              {new Date(task.dueDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {showActions && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

interface TaskTableProps {
  tasks: Task[];
  onPress: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  showActions?: boolean;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onPress,
  onEdit,
  onDelete,
  showActions,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (isMobile) {
    return (
      <View style={styles.cardList}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => onPress(task)}
            onEdit={onEdit ? () => onEdit(task) : undefined}
            onDelete={onDelete ? () => onDelete(task) : undefined}
            showActions={showActions}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thTitle]}>Task</Text>
        <Text style={styles.th}>Assignee</Text>
        <Text style={styles.th}>Status</Text>
        <Text style={styles.th}>Priority</Text>
        <Text style={styles.th}>Due Date</Text>
        {showActions && <Text style={styles.th}>Actions</Text>}
      </View>
      {tasks.map((task) => {
        const status = statusColors[task.status];
        const priority = priorityColors[task.priority];
        return (
          <TouchableOpacity
            key={task.id}
            style={styles.tableRow}
            onPress={() => onPress(task)}
          >
            <View style={styles.thTitle}>
              <Text style={styles.tdTitle} numberOfLines={1}>{task.title}</Text>
              {task.department && (
                <Text style={styles.tdSub}>{task.department}</Text>
              )}
            </View>
            <Text style={styles.td}>{task.assignee?.name || '—'}</Text>
            <View>
              <Badge label={status.label} color={status.text} bgColor={status.bg} />
            </View>
            <View>
              <Badge label={task.priority} color={priority.text} bgColor={priority.bg} />
            </View>
            <Text style={styles.td}>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
            </Text>
            {showActions && (
              <View style={styles.tableActions}>
                {onEdit && (
                  <TouchableOpacity onPress={() => onEdit(task)}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
                {onDelete && (
                  <TouchableOpacity onPress={() => onDelete(task)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardHeader: { marginBottom: 8 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { ...typography.h4, color: colors.text, flex: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  department: { ...typography.caption, color: colors.textMuted },
  description: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  assignee: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assigneeText: { ...typography.caption, color: colors.textMuted },
  dueDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueDateText: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  actionBtn: { padding: 6 },
  cardList: { gap: 0 },
  table: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: { flex: 1, ...typography.caption, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  thTitle: { flex: 2 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  td: { flex: 1, ...typography.bodySmall, color: colors.textSecondary },
  tdTitle: { ...typography.label, color: colors.text },
  tdSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  tableActions: { flex: 1, flexDirection: 'row', gap: 12 },
});
