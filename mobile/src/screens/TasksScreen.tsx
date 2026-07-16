import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { colors, borderRadius, typography, statusColors } from '../theme';
import { Button, Input, LoadingScreen, EmptyState } from '../components/ui';
import { TaskTable } from '../components/tasks';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useUsers } from '../hooks/useApi';
import { RootState } from '../store';
import { Task, TaskStatus, Priority, TaskFilters } from '../types';

interface TasksScreenProps {
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({ onNavigate }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MEMBER';

  const [filters, setFilters] = useState<TaskFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useTasks({ ...filters, search: search || undefined });
  const { data: users } = useUsers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      title: '',
      description: '',
      assignedTo: '',
      status: 'ON_HOLD' as TaskStatus,
      priority: 'MEDIUM' as Priority,
      department: '',
      remarks: '',
      dueDate: '',
    },
  });

  const openCreate = () => {
    setEditingTask(null);
    reset();
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setValue('title', task.title);
    setValue('description', task.description || '');
    setValue('assignedTo', task.assignedTo || '');
    setValue('status', task.status);
    setValue('priority', task.priority);
    setValue('department', task.department || '');
    setValue('remarks', task.remarks || '');
    setValue('dueDate', task.dueDate ? task.dueDate.split('T')[0] : '');
    setShowModal(true);
  };

  const handleDelete = (task: Task) => {
    Alert.alert('Delete Task', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTask.mutate(task.id),
      },
    ]);
  };

  const onSubmit = (formData: Record<string, string>) => {
    const payload = {
      ...formData,
      dueDate: formData.dueDate || undefined,
      assignedTo: formData.assignedTo || undefined,
    };

    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, data: payload },
        { onSuccess: () => { setShowModal(false); reset(); } }
      );
    } else {
      createTask.mutate(payload, {
        onSuccess: () => { setShowModal(false); reset(); },
      });
    }
  };

  const statusFilters: (TaskStatus | 'ALL')[] = ['ALL', 'PROCESSED', 'REJECTED', 'ON_HOLD'];

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="filter" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {isAdmin && (
          <Button title="New Task" onPress={openCreate} size="sm" icon={<Ionicons name="add" size={18} color={colors.white} />} />
        )}
      </View>

      {/* Filter chips */}
      {showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {statusFilters.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, filters.status === (s === 'ALL' ? undefined : s) && styles.filterChipActive]}
              onPress={() => setFilters({ ...filters, status: s === 'ALL' ? undefined : s, page: 1 })}
            >
              <Text style={[styles.filterChipText, filters.status === (s === 'ALL' ? undefined : s) && styles.filterChipTextActive]}>
                {s === 'ALL' ? 'All' : statusColors[s]?.label || s}
              </Text>
            </TouchableOpacity>
          ))}
          {(['createdAt', 'dueDate', 'priority', 'status'] as const).map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[styles.filterChip, filters.sortBy === sort && styles.filterChipActive]}
              onPress={() =>
                setFilters({
                  ...filters,
                  sortBy: sort,
                  sortOrder: filters.sortBy === sort && filters.sortOrder === 'desc' ? 'asc' : 'desc',
                })
              }
            >
              <Text style={styles.filterChipText}>
                {sort} {filters.sortBy === sort ? (filters.sortOrder === 'desc' ? '↓' : '↑') : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Task list */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {isLoading ? (
          <LoadingScreen />
        ) : !data?.tasks.length ? (
          <EmptyState title="No tasks found" subtitle="Try adjusting your filters or create a new task" />
        ) : (
          <TaskTable
            tasks={data.tasks}
            onPress={(task) => onNavigate('TaskDetail', { taskId: task.id })}
            onEdit={isAdmin ? openEdit : (task) => openEdit(task)}
            onDelete={isAdmin ? handleDelete : undefined}
            showActions
          />
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <View style={styles.pagination}>
            <Button
              title="Previous"
              variant="outline"
              size="sm"
              disabled={filters.page === 1}
              onPress={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
            />
            <Text style={styles.pageInfo}>
              Page {data.pagination.page} of {data.pagination.totalPages}
            </Text>
            <Button
              title="Next"
              variant="outline"
              size="sm"
              disabled={filters.page === data.pagination.totalPages}
              onPress={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
            />
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTask ? 'Edit Task' : 'Create Task'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Controller control={control} name="title" rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <Input label="Title" value={value} onChangeText={onChange} placeholder="Task title" />
                )}
              />
              <Controller control={control} name="description"
                render={({ field: { onChange, value } }) => (
                  <Input label="Description" value={value} onChangeText={onChange} placeholder="Description" multiline />
                )}
              />
              {isAdmin && (
                <>
                  <Controller control={control} name="department"
                    render={({ field: { onChange, value } }) => (
                      <Input label="Department" value={value} onChangeText={onChange} placeholder="e.g. Sales, HR" />
                    )}
                  />
                  <Text style={styles.fieldLabel}>Assignee</Text>
                  <ScrollView horizontal style={styles.chipRow}>
                    {(users || []).map((u) => (
                      <Controller key={u.id} control={control} name="assignedTo"
                        render={({ field: { onChange, value } }) => (
                          <TouchableOpacity
                            style={[styles.chip, value === u.id && styles.chipActive]}
                            onPress={() => onChange(value === u.id ? '' : u.id)}
                          >
                            <Text style={[styles.chipText, value === u.id && styles.chipTextActive]}>{u.name}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    ))}
                  </ScrollView>
                </>
              )}
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.chipRow}>
                {(['PROCESSED', 'REJECTED', 'ON_HOLD'] as TaskStatus[]).map((s) => (
                  <Controller key={s} control={control} name="status"
                    render={({ field: { onChange, value } }) => (
                      <TouchableOpacity
                        style={[styles.chip, value === s && { backgroundColor: statusColors[s].bg }]}
                        onPress={() => onChange(s)}
                      >
                        <Text style={[styles.chipText, value === s && { color: statusColors[s].text }]}>
                          {statusColors[s].label}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.chipRow}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
                  <Controller key={p} control={control} name="priority"
                    render={({ field: { onChange, value } }) => (
                      <TouchableOpacity
                        style={[styles.chip, value === p && styles.chipActive]}
                        onPress={() => onChange(p)}
                      >
                        <Text style={[styles.chipText, value === p && styles.chipTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    )}
                  />
                ))}
              </View>
              <Controller control={control} name="dueDate"
                render={({ field: { onChange, value } }) => (
                  <Input label="Due Date" value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" />
                )}
              />
              <Controller control={control} name="remarks"
                render={({ field: { onChange, value } }) => (
                  <Input label="Remarks" value={value} onChangeText={onChange} placeholder="Additional notes" multiline />
                )}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setShowModal(false)} />
              <Button
                title={editingTask ? 'Update' : 'Create'}
                onPress={handleSubmit(onSubmit)}
                loading={createTask.isPending || updateTask.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  filterBtn: { padding: 10, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  filterRow: { paddingHorizontal: 16, marginBottom: 8, maxHeight: 40 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
  filterChipText: { fontSize: 13, color: colors.textSecondary },
  filterChipTextActive: { color: colors.primary, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 0 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 },
  pageInfo: { color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: colors.backgroundLight, borderRadius: borderRadius.xl, maxHeight: '90%', borderWidth: 1, borderColor: colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { ...typography.h3, color: colors.text },
  modalForm: { padding: 20, maxHeight: 500 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
});
