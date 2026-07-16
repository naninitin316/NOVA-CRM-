import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Controller, useForm } from 'react-hook-form';
import { isAxiosError } from 'axios';
import { ArrowLeft, FileUp, Plus } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { useCreateTask, useUsers } from '@/hooks/useApi';
import type { RootState } from '@/store';
import type { Priority, TaskStatus } from '@/types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  PROCESSED: 'Processed',
  REJECTED: 'Rejected',
  ON_HOLD: 'On Hold',
};
const DEPARTMENT_OPTIONS = ['Sales', 'HR', 'IT', 'Administration', 'Finance', 'Engineering', 'Marketing', 'Support'] as const;
const TEAM_ROLES = ['MEMBER', 'CONTRIBUTOR', 'SALES_TEAM', 'HR_TEAM'] as const;

interface TaskFormValues {
  title: string;
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCompany: string;
  customerSource: string;
  assignedTo: string;
  status: TaskStatus;
  priority: Priority;
  remarks: string;
  dueDate: string;
}

export function TaskCreatePage() {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const isContributor = user?.role === 'CONTRIBUTOR';
  const { data: users } = useUsers();
  const createTask = useCreateTask();
  const [error, setError] = useState('');
  const [department, setDepartment] = useState<(typeof DEPARTMENT_OPTIONS)[number]>('Sales');

  const { control, handleSubmit, watch } = useForm<TaskFormValues>({
    defaultValues: {
      title: '',
      description: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerCompany: '',
      customerSource: '',
      assignedTo: '',
      status: 'ON_HOLD',
      priority: 'MEDIUM',
      remarks: '',
      dueDate: '',
    },
  });

  const title = watch('title');

  const onSubmit = (formData: TaskFormValues) => {
    setError('');
    const assignee = users?.find((item) => item.id === formData.assignedTo);
    const payload: Record<string, unknown> = {
      title: formData.title.trim(),
      status: formData.status,
      priority: formData.priority,
    };

    if (formData.description.trim()) payload.description = formData.description.trim();
    if (formData.customerName.trim()) payload.customerName = formData.customerName.trim();
    if (formData.customerPhone.trim()) payload.customerPhone = formData.customerPhone.trim();
    if (formData.customerEmail.trim()) payload.customerEmail = formData.customerEmail.trim();
    if (formData.customerCompany.trim()) payload.customerCompany = formData.customerCompany.trim();
    if (formData.customerSource.trim()) payload.customerSource = formData.customerSource.trim();
    if (formData.remarks.trim()) payload.remarks = formData.remarks.trim();
    if (formData.dueDate) payload.dueDate = formData.dueDate;
    if (isContributor) {
      payload.assignedTo = formData.assignedTo || user?.id;
      payload.department = assignee?.department || user?.department || department;
    } else {
      if (formData.assignedTo) payload.assignedTo = formData.assignedTo;
      payload.department = assignee?.department || department;
    }

    createTask.mutate(payload, {
      onSuccess: (response) => {
        const task = response.data.data;
        const taskId = task?.id;
        const assignedToSomeoneElse = isContributor && task?.assignedTo && task.assignedTo !== user?.id;
        navigate(taskId && !assignedToSomeoneElse ? `/tasks/${taskId}` : '/tasks', { state: { toast: 'Successfully done. Task created.' } });
      },
      onError: (err) => {
        const message = isAxiosError(err)
          ? err.response?.data?.error || err.response?.data?.message || err.message
          : 'Task could not be created.';
        setError(message);
      },
    });
  };

  const assignees = useMemo(
    () => (users || []).filter((item) => {
      if (!item.isActive) return false;
      if (isContributor) return item.role === 'CONTRIBUTOR';
      return TEAM_ROLES.includes(item.role as (typeof TEAM_ROLES)[number]) && item.department === department;
    }),
    [department, isContributor, users]
  );

  return (
    <>
      <TopBar title="New Task" />
      <div className="page animate-fade-in">
        <button className="btn btn-ghost btn-sm task-detail-back" onClick={() => navigate('/tasks')}>
          <ArrowLeft size={15} /> Back to Tasks
        </button>

        <form className="task-edit-shell" onSubmit={handleSubmit(onSubmit)}>
          <div className="card task-edit-header">
            <div>
              <p className="task-edit-eyebrow">Create task</p>
              <h2 className="task-detail-title">{title.trim() || 'Untitled task'}</h2>
            </div>
            <div className="task-edit-actions">
              {!isContributor && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks/import')}>
                  <FileUp size={14} /> Import CSV
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={createTask.isPending || !title.trim()}>
                <Plus size={14} /> Create
              </button>
            </div>
          </div>

          {error && <div className="card task-import-error">{error}</div>}

          <div className="task-edit-grid">
            <section className="card task-detail-card">
              <h3 className="task-detail-section-title">Task Information</h3>
              <Controller control={control} name="title" rules={{ required: true }}
                render={({ field }) => <div className="form-group"><label className="form-label">Title</label><input className="form-input" {...field} /></div>}
              />
              <Controller control={control} name="description"
                render={({ field }) => <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={4} {...field} /></div>}
              />
              <Controller control={control} name="remarks"
                render={({ field }) => <div className="form-group"><label className="form-label">Comment</label><textarea className="form-input" rows={3} {...field} /></div>}
              />
            </section>

            <aside className="card task-detail-card">
              <h3 className="task-detail-section-title">Lead Details</h3>
              <Controller control={control} name="customerName"
                render={({ field }) => <div className="form-group"><label className="form-label">Customer Name</label><input className="form-input" {...field} /></div>}
              />
              <Controller control={control} name="customerPhone"
                render={({ field }) => <div className="form-group"><label className="form-label">Phone</label><input className="form-input" {...field} /></div>}
              />
              <Controller control={control} name="customerEmail"
                render={({ field }) => <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" {...field} /></div>}
              />
              <Controller control={control} name="customerCompany"
                render={({ field }) => <div className="form-group"><label className="form-label">Company</label><input className="form-input" {...field} /></div>}
              />
              <Controller control={control} name="customerSource"
                render={({ field }) => <div className="form-group"><label className="form-label">Source</label><input className="form-input" {...field} /></div>}
              />
            </aside>

            <aside className="card task-detail-card">
              <h3 className="task-detail-section-title">Assignment</h3>
              {!isContributor && (
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <div className="chip-row task-edit-chip-row">
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
                </div>
              )}
              <div className="form-group">
                <label className="form-label">{isContributor ? 'Contributor' : 'Assignee'}</label>
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
                      {isContributor && !assignees.length && <span className="task-comments-sub">No active contributors found.</span>}
                    </div>
                  )}
                />
                {isContributor && (
                  <p className="task-comments-sub" style={{ marginTop: 8 }}>
                    Select a contributor, or leave it empty to assign this task to yourself.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <Controller control={control} name="status"
                  render={({ field }) => (
                    <div className="chip-row task-edit-chip-row">
                      {(['PROCESSED', 'REJECTED', 'ON_HOLD'] as TaskStatus[]).map((status) => (
                        <button key={status} type="button" className={`chip ${field.value === status ? 'active' : ''}`}
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
                        <button key={priority} type="button" className={`chip ${field.value === priority ? 'active' : ''}`}
                          onClick={() => field.onChange(priority)}>{priority}</button>
                      ))}
                    </div>
                  )}
                />
              </div>
              <Controller control={control} name="dueDate"
                render={({ field }) => <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" {...field} /></div>}
              />
            </aside>
          </div>
        </form>
      </div>
    </>
  );
}
