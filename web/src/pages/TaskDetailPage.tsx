import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Bell,
  Edit3,
  ExternalLink,
  Hash,
  Mail,
  MessageSquare,
  Phone,
  Send,
  User,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { useAddTaskComment, useCreateReminder, useReminders, useTask } from '@/hooks/useApi';
import { Toast } from '@/components/ui/Toast';
import { getWhatsAppUrl } from '@/utils/phone';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PROCESSED: { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Processed' },
  REJECTED: { bg: 'var(--error-bg)', color: 'var(--error)', label: 'Rejected' },
  ON_HOLD: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'On Hold' },
};

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  LOW: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  MEDIUM: { bg: 'var(--info-bg)', color: 'var(--info)' },
  HIGH: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  URGENT: { bg: 'var(--error-bg)', color: 'var(--error)' },
};

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: task, isLoading } = useTask(id!);
  const { data: reminders = [] } = useReminders(false);
  const addComment = useAddTaskComment();
  const createReminder = useCreateReminder();
  const [comment, setComment] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [toast, setToast] = useState<{ text: string; kind?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const stateToast = (location.state as { toast?: string } | null | undefined)?.toast;
    if (stateToast) {
      setToast({ text: stateToast, kind: 'success' });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  if (isLoading) return <><TopBar title="Task Details" /><div className="loading-screen"><div className="spinner" /></div></>;
  if (!task) return <><TopBar title="Task Details" /><div className="page"><p style={{ color: 'var(--error)' }}>Task not found</p></div></>;

  const status = STATUS_STYLES[task.status];
  const priority = PRIORITY_STYLES[task.priority];
  const comments = task.comments || [];
  const taskReminders = reminders.filter((reminder) => reminder.taskId === task.id);
  const activeTaskReminder = taskReminders[0];
  const reminderIsDue = activeTaskReminder ? new Date(activeTaskReminder.remindAt).getTime() <= Date.now() : false;
  const whatsappUrl = getWhatsAppUrl(task.customerPhone);
  const leadDetails = [
    { label: 'Customer', value: task.customerName },
    { label: 'Phone', value: task.customerPhone },
    { label: 'Email', value: task.customerEmail },
    { label: 'Company', value: task.customerCompany },
    { label: 'Source', value: task.customerSource },
  ].filter((item) => item.value);
  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleCommentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = comment.trim();
    if (!id || !trimmed) return;

    addComment.mutate(
      { id, data: { comment: trimmed } },
      {
        onSuccess: () => {
          setComment('');
          setToast({ text: 'Successfully done. Comment added.', kind: 'success' });
        },
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Comment could not be added.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  const handleReminderSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !reminderAt) return;

    createReminder.mutate(
      {
        taskId: id,
        remindAt: new Date(reminderAt).toISOString(),
        note: reminderNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          setReminderAt('');
          setReminderNote('');
          setToast({ text: 'Successfully done. Task reminder set.', kind: 'success' });
        },
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Reminder could not be created.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  return (
    <>
      <TopBar title="Task Details" />
      <div className="page animate-fade-in">
        <Toast open={!!toast} text={toast?.text || ''} kind={toast?.kind || 'success'} onClose={() => setToast(null)} />
        <div className="task-view-header">
          <button className="task-view-breadcrumb" onClick={() => navigate('/tasks')}>
            <ArrowLeft size={16} />
            <span>Tasks</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/tasks/${task.id}/edit`)}>
            <Edit3 size={15} /> Edit
          </button>
        </div>

        <div className="task-view-shell">
          <aside className="task-view-sidebar">
            <div className="task-view-card task-contact-card">
              <div className="task-view-section-head">
                <h3>Lead contact</h3>
                <span>{leadDetails.length ? 'Customer details' : 'No lead data'}</span>
              </div>

              <div className="task-contact-avatar">
                {(task.customerName || task.customerEmail || task.customerPhone || 'L').charAt(0).toUpperCase()}
              </div>
              <h4>{task.customerName || 'Unknown lead'}</h4>
              <p>{task.customerCompany || task.customerSource || 'No company/source added'}</p>

              <div className="task-contact-actions">
                {whatsappUrl && (
                  <a className="btn btn-primary btn-sm" href={whatsappUrl} target="_blank" rel="noreferrer">
                    <Phone size={14} /> WhatsApp
                  </a>
                )}
                {task.customerEmail && (
                  <a className="btn btn-secondary btn-sm" href={`mailto:${task.customerEmail}`}>
                    <Mail size={14} /> Email
                  </a>
                )}
              </div>

              <div className="task-contact-list">
                {leadDetails.map((item) => (
                  <div className="task-contact-row" key={item.label}>
                    <span>{item.label}</span>
                    {item.label === 'Phone' && whatsappUrl ? (
                      <a href={whatsappUrl} target="_blank" rel="noreferrer">
                        {item.value} <ExternalLink size={12} />
                      </a>
                    ) : item.label === 'Email' ? (
                      <a href={`mailto:${item.value}`}>{item.value}</a>
                    ) : (
                      <strong>{item.value}</strong>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="task-view-card task-owner-card">
              <div className="task-view-section-head">
                <h3>Ownership</h3>
                <span>Follow-up owner</span>
              </div>
              <div className="task-owner-row">
                <div className="task-owner-avatar">{(task.assignee?.name || 'U').charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{task.assignee?.name || 'Unassigned'}</strong>
                  <span>{task.assignee?.department || task.department || 'No department'}</span>
                </div>
              </div>
              <div className="task-owner-list">
                <div><span>Company</span><strong>{task.company || 'Not set'}</strong></div>
                <div><span>Department</span><strong>{task.department || 'Not set'}</strong></div>
                <div><span>Last updated</span><strong>{task.updatedAt ? formatDateTime(task.updatedAt) : 'Not set'}</strong></div>
              </div>
            </div>
          </aside>

          <section className="task-view-main">
            <div className="task-view-hero">
              <div className="task-view-title-row">
                <div>
                  <p className="task-view-eyebrow">Task</p>
                  <h2 className="task-detail-title">{task.title}</h2>
                </div>
                <div className="task-detail-badges">
                  <span className="badge" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                  <span className="badge" style={{ background: priority.bg, color: priority.color }}>{task.priority}</span>
                </div>
              </div>

              <div className="task-view-fields">
                {[
                  { icon: User, label: 'Assigned user', value: task.assignee?.name || 'Unassigned', hint: task.assignee?.department || 'No team set' },
                  { icon: Building2, label: 'Company', value: task.company || 'No company set', hint: task.department || 'No department' },
                  { icon: Calendar, label: 'Due date', value: task.dueDate ? formatDateTime(task.dueDate) : 'Not set', hint: 'Deadline' },
                  { icon: Clock, label: 'Created', value: formatDateTime(task.createdAt), hint: 'Task opened' },
                  { icon: Hash, label: 'Reference', value: task.id.slice(0, 8), hint: 'Task ID' },
                  { icon: CheckCircle2, label: 'Status', value: status.label, hint: task.priority },
                ].map(({ icon: Icon, label, value, hint }) => (
                  <div className="task-view-field" key={label}>
                    <Icon size={16} />
                    <div>
                      <span>{label}</span>
                      <strong>{value}</strong>
                      <small>{hint}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="task-view-card task-description-card">
              <div className="task-view-section-head">
                <h3>Description</h3>
                <span>Internal context</span>
              </div>
              <p className="task-detail-body">{task.description || 'No description has been added for this task.'}</p>
            </div>

            <form className="task-view-card task-reminder-form" onSubmit={handleReminderSubmit}>
              <div className="task-reminder-head">
                <div>
                  <h4>{activeTaskReminder ? 'Reminder is set' : 'Task reminder'}</h4>
                  <span>{activeTaskReminder ? 'This task will appear in notifications when due' : 'Shows in the top notification bell when due'}</span>
                </div>
                <Bell size={17} color="var(--primary)" />
              </div>
              {activeTaskReminder && (
                <div className="task-reminder-set">
                  <div>
                    <span>{reminderIsDue ? 'Due now' : 'Scheduled for'}</span>
                    <strong>{formatDateTime(activeTaskReminder.remindAt)}</strong>
                    {activeTaskReminder.note && <p>{activeTaskReminder.note}</p>}
                  </div>
                  {taskReminders.length > 1 && <small>+{taskReminders.length - 1} more</small>}
                </div>
              )}
              <div className="task-reminder-grid">
                <input
                  className="form-input"
                  type="datetime-local"
                  value={reminderAt}
                  onChange={(event) => setReminderAt(event.target.value)}
                  aria-label="Reminder date and time"
                />
                <input
                  className="form-input"
                  value={reminderNote}
                  onChange={(event) => setReminderNote(event.target.value)}
                  placeholder="Reminder note optional"
                />
                <button className="btn btn-secondary btn-sm" type="submit" disabled={!reminderAt || createReminder.isPending}>
                  <Bell size={14} /> Set reminder
                </button>
              </div>
            </form>

            <div className="task-view-card task-comments-panel">
              <div className="task-comments-header">
                <div>
                  <h3 className="task-comments-title">Activity</h3>
                  <p className="task-comments-sub">{comments.length} comment{comments.length === 1 ? '' : 's'}</p>
                </div>
                <MessageSquare size={18} color="var(--primary)" />
              </div>

              <form className="task-comment-form" onSubmit={handleCommentSubmit}>
                <textarea
                  className="form-input"
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                />
                <div className="task-comment-actions">
                  <button className="btn btn-primary btn-sm" type="submit" disabled={!comment.trim() || addComment.isPending}>
                    <Send size={14} /> Add comment
                  </button>
                </div>
              </form>

              <div className="task-comment-list">
                {comments.length ? comments.map((item) => (
                  <div className="task-comment-item" key={item.id}>
                    <div className="task-comment-dot" />
                    <div className="task-comment-content">
                      <div className="task-comment-item-head">
                        <span>{item.user?.name || 'User'}</span>
                        <time>{formatDateTime(item.commentDate)}</time>
                      </div>
                      <p>{item.comment}</p>
                    </div>
                  </div>
                )) : (
                  <div className="task-comments-empty">No activity yet. Add the first update for this task.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
