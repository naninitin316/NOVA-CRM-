import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Controller, useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { useTask, useUpdateTask, useUsers } from '@/hooks/useApi';
import type { RootState } from '@/store';
import type { Priority, TaskStatus } from '@/types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  PROCESSED: 'Processed',
  REJECTED: 'Rejected',
  ON_HOLD: 'On Hold',
};
const DEPARTMENT_OPTIONS = ['Sales', 'HR', 'IT', 'Administration', 'Finance', 'Engineering', 'Marketing', 'Support'] as const;
const TEAM_ROLES = ['MEMBER', 'CONTRIBUTOR', 'SALES_TEAM', 'HR_TEAM'] as const;
const PROGRESS_ROLES = ['CONTRIBUTOR', 'SALES_TEAM', 'HR_TEAM'] as const;

interface TaskFormValues {
  title: string;
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCompany: string;
  customerSource: string;
  projectName: string;
  assignedTo: string;
  status: TaskStatus;
  priority: Priority;
  remarks: string;
  dueDate: string;
}

export function TaskEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const canEditTaskDetails = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MEMBER';
  const canUpdateProgress = canEditTaskDetails || PROGRESS_ROLES.includes(user?.role as (typeof PROGRESS_ROLES)[number]);
  const canEditPriority = canEditTaskDetails || user?.role === 'CONTRIBUTOR';
  const { data: task, isLoading } = useTask(id!);
  const { data: users } = useUsers();
  const updateTask = useUpdateTask();
  const [department, setDepartment] = useState<(typeof DEPARTMENT_OPTIONS)[number]>('Sales');

  const { control, handleSubmit, reset } = useForm<TaskFormValues>({
    defaultValues: {
      title: '',
      description: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerCompany: '',
      customerSource: '',
      projectName: '',
      assignedTo: '',
      status: 'ON_HOLD',
      priority: 'MEDIUM',
      remarks: '',
      dueDate: '',
    },
  });

  useEffect(() => {
    if (!task) return;
    const inferredDepartment = (task.assignee?.department || task.department || 'Sales') as (typeof DEPARTMENT_OPTIONS)[number];
    setDepartment(DEPARTMENT_OPTIONS.includes(inferredDepartment) ? inferredDepartment : 'Sales');
    reset({
      title: task.title,
      description: task.description || '',
      customerName: task.customerName || '',
      customerPhone: task.customerPhone || '',
      customerEmail: task.customerEmail || '',
      customerCompany: task.customerCompany || '',
      customerSource: task.customerSource || '',
      projectName: task.projectName || '',
      assignedTo: task.assignedTo || '',
      status: task.status,
      priority: task.priority,
      remarks: task.remarks || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
  }, [reset, task]);

  const assignees = useMemo(
    () => (users || []).filter((assignee) => assignee.isActive && TEAM_ROLES.includes(assignee.role as (typeof TEAM_ROLES)[number]) && assignee.department === department),
    [department, users]
  );

  const onSubmit = (formData: TaskFormValues) => {
    if (!id) return;

    const payload = canEditTaskDetails
      ? {
          ...formData,
          dueDate: formData.dueDate || undefined,
          assignedTo: formData.assignedTo || undefined,
          department: formData.assignedTo ? (users?.find((assignee) => assignee.id === formData.assignedTo)?.department || department) : department,
        }
      : {
          status: formData.status,
          ...(canEditPriority ? { priority: formData.priority } : {}),
          remarks: formData.remarks,
        };

    updateTask.mutate(
      { id, data: payload },
      { onSuccess: () => navigate(`/tasks/${id}`, { state: { toast: 'Successfully done. Task saved.' } }) }
    );
  };

  if (isLoading) return <><TopBar title="Edit Task" /><div className="loading-screen"><div className="spinner" /></div></>;
  if (!task) return <><TopBar title="Edit Task" /><div className="page"><p style={{ color: 'var(--error)' }}>Task not found</p></div></>;

  return (
    <>
      <TopBar title="Edit Task" />
      <div className="page animate-fade-in">
        <button className="btn btn-ghost btn-sm task-detail-back" onClick={() => navigate(`/tasks/${task.id}`)}>
          <ArrowLeft size={15} /> Back to Task
        </button>

        <form className="task-edit-shell" onSubmit={handleSubmit(onSubmit)}>
          <div className="card task-edit-header">
            <div>
              <p className="task-edit-eyebrow">Editing task</p>
              <h2 className="task-detail-title">{task.title}</h2>
            </div>
            <div className="task-edit-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/tasks/${task.id}`)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={updateTask.isPending || !(canEditTaskDetails || canUpdateProgress)}>
                <Save size={14} /> Save
              </button>
            </div>
          </div>

          <div className="task-edit-grid">
            <section className="card task-detail-card">
              <h3 className="task-detail-section-title">Task Information</h3>
              <Controller control={control} name="title" rules={{ required: true }}
                render={({ field }) => <div className="form-group"><label className="form-label">Title</label><input className="form-input" disabled={!canEditTaskDetails} {...field} /></div>}
              />
              <Controller control={control} name="description"
                render={({ field }) => <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={4} disabled={!canEditTaskDetails} {...field} /></div>}
              />
              <Controller control={control} name="remarks"
                render={({ field }) => <div className="form-group"><label className="form-label">Comment</label><textarea className="form-input" rows={3} disabled={!canUpdateProgress} {...field} /></div>}
              />
            </section>

            <aside className="card task-detail-card">
              <h3 className="task-detail-section-title">Lead Details</h3>
              <Controller control={control} name="customerName"
                render={({ field }) => <div className="form-group"><label className="form-label">Customer Name</label><input className="form-input" disabled={!canEditTaskDetails} {...field} /></div>}
              />
              <Controller control={control} name="customerPhone"
                render={({ field }) => <div className="form-group"><label className="form-label">Phone</label><input className="form-input" disabled={!canEditTaskDetails} {...field} /></div>}
              />
              <Controller control={control} name="customerEmail"
                render={({ field }) => <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" disabled={!canEditTaskDetails} {...field} /></div>}
              />
              <Controller control={control} name="customerCompany"
                render={({ field }) => <div className="form-group"><label className="form-label">Company</label><input className="form-input" disabled={!canEditTaskDetails} {...field} /></div>}
              />
              <Controller control={control} name="customerSource"
                render={({ field }) => <div className="form-group"><label className="form-label">Source</label><input className="form-input" disabled={!canEditTaskDetails} {...field} /></div>}
              />
              <Controller control={control} name="projectName"
                render={({ field }) => <div className="form-group"><label className="form-label">Project Name</label><input className="form-input" disabled={!canEditTaskDetails} {...field} /></div>}
              />
            </aside>

            <aside className="card task-detail-card">
              <h3 className="task-detail-section-title">Assignment</h3>
              {canEditTaskDetails && (
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <div className="chip-row task-edit-chip-row" style={{ marginBottom: 12 }}>
                    {DEPARTMENT_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`chip ${department === item ? 'active' : ''}`}
                        onClick={() => setDepartment(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <label className="form-label">Assignee</label>
                  <Controller control={control} name="assignedTo"
                    render={({ field }) => (
                      <div className="chip-row task-edit-chip-row">
                        {assignees.map((assignee) => (
                          <button key={assignee.id} type="button"
                            className={`chip ${field.value === assignee.id ? 'active' : ''}`}
                            onClick={() => field.onChange(field.value === assignee.id ? '' : assignee.id)}>
                            {assignee.name}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Status</label>
                <Controller control={control} name="status"
                  render={({ field }) => (
                    <div className="chip-row task-edit-chip-row">
                      {(['PROCESSED', 'REJECTED', 'ON_HOLD'] as TaskStatus[]).map((status) => (
                        <button key={status} type="button" className={`chip ${field.value === status ? 'active' : ''}`} disabled={!canUpdateProgress}
                          onClick={() => field.onChange(status)}>{STATUS_LABELS[status]}</button>
                      ))}
                    </div>
                  )}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <Controller control={control} name="priority"
                  render={({ field }) => (
                    <div className="chip-row task-edit-chip-row">
                      {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((priority) => (
                        <button key={priority} type="button" className={`chip ${field.value === priority ? 'active' : ''}`} disabled={!canEditPriority}
                          onClick={() => field.onChange(priority)}>{priority}</button>
                      ))}
                    </div>
                  )}
                />
              </div>
              <Controller control={control} name="dueDate"
                render={({ field }) => <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" disabled={!canEditTaskDetails} {...field} /></div>}
              />
            </aside>
          </div>
        </form>
      </div>
    </>
  );
}
