import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Clock3, MousePointerClick } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useDismissReminder, useOnlineLeadNotifications, useReminders } from '@/hooks/useApi';
import { markOnlineLeadsSeen } from '@/utils/onlineLeadSeen';
import type { RootState } from '@/store';
import type { Task, TaskReminder } from '@/types';

function normalizeKey(value?: string | null) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';
}

function onlineLeadProject(lead: Task) {
  const project = lead.projectName || lead.customerCompany || '';
  const source = normalizeKey(lead.remarks || lead.customerSource || lead.description);
  const key = normalizeKey(project);

  if (key.includes('signature') || source.includes('signaturevillas')) {
    return { label: 'Signature Villas', filter: 'signaturevillas' };
  }
  if (key.includes('visionary') || source.includes('visionarycity')) {
    return { label: 'Visionary City', filter: 'visionary-city' };
  }
  return { label: project || 'Website submission', filter: 'all' };
}

function formatReminderTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReminderBell() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const canUseOnlineLeads = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const { data: reminders = [] } = useReminders(true);
  const { data: onlineLeads = [] } = useOnlineLeadNotifications(
    user?.role === 'SUPER_ADMIN' ? undefined : user?.company || undefined,
    canUseOnlineLeads,
    user?.id
  );
  const dismissReminder = useDismissReminder();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notificationCount = reminders.length + onlineLeads.length;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const openTask = (reminder: TaskReminder) => {
    setOpen(false);
    navigate(`/tasks/${reminder.taskId}`);
  };

  const openOnlineLeads = (lead?: Task) => {
    setOpen(false);
    if (lead) {
      markOnlineLeadsSeen([lead], user?.id, user?.company);
    }
    const project = lead ? onlineLeadProject(lead).filter : 'all';
    navigate(project === 'all' ? '/online-leads' : `/online-leads?project=${project}`);
  };

  const dismissOnlineLead = (lead: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    markOnlineLeadsSeen([lead], user?.id, user?.company);
  };

  const clearAllOnlineLeads = (e: React.MouseEvent) => {
    e.stopPropagation();
    markOnlineLeadsSeen(onlineLeads, user?.id, user?.company);
  };

  return (
    <div className="reminder-bell" ref={ref}>
      <button
        type="button"
        className={`reminder-bell-btn ${notificationCount ? 'has-reminders' : ''}`}
        aria-label={notificationCount ? `${notificationCount} notification${notificationCount === 1 ? '' : 's'}` : 'Notifications'}
        title="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {notificationCount > 0 && <span>{notificationCount > 9 ? '9+' : notificationCount}</span>}
      </button>

      {open && (
        <div className="reminder-menu">
          <div className="reminder-menu-head">
            <strong>Notifications</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{notificationCount} new</span>
              {onlineLeads.length > 0 && (
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary, #3b82f6)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 4px',
                    textDecoration: 'underline',
                  }}
                  onClick={clearAllOnlineLeads}
                >
                  Clear leads
                </button>
              )}
            </div>
          </div>
          <div className="reminder-list">
            {onlineLeads.map((lead) => (
              <div key={lead.id} className="reminder-item">
                <button type="button" className="reminder-item-main" onClick={() => openOnlineLeads(lead)}>
                  <div className="reminder-item-icon"><MousePointerClick size={15} /></div>
                  <div>
                    <strong>{lead.customerName || lead.customerPhone || lead.customerEmail || 'New online lead'}</strong>
                    <span>Online lead · {onlineLeadProject(lead).label}</span>
                    <small>{formatReminderTime(lead.createdAt)}</small>
                  </div>
                </button>
                <button
                  type="button"
                  className="reminder-dismiss"
                  aria-label="Mark as read"
                  title="Mark as read"
                  onClick={(e) => dismissOnlineLead(lead, e)}
                >
                  <CheckCircle2 size={16} />
                </button>
              </div>
            ))}
            {reminders.map((reminder) => (
              <div key={reminder.id} className="reminder-item">
                <button type="button" className="reminder-item-main" onClick={() => openTask(reminder)}>
                  <div className="reminder-item-icon"><Clock3 size={15} /></div>
                  <div>
                    <strong>{reminder.task.title}</strong>
                    <span>{reminder.note || reminder.task.customerName || 'Task follow-up'}</span>
                    <small>{formatReminderTime(reminder.remindAt)}</small>
                  </div>
                </button>
                <button
                  type="button"
                  className="reminder-dismiss"
                  aria-label="Dismiss reminder"
                  onClick={() => dismissReminder.mutate(reminder.id)}
                >
                  <CheckCircle2 size={16} />
                </button>
              </div>
            ))}
            {!notificationCount && (
              <div className="reminder-empty">
                <Bell size={18} />
                <p>No notifications right now.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
