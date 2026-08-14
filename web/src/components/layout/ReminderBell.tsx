import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Clock3, MousePointerClick } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useDismissReminder, useOnlineLeadNotifications, useReminders } from '@/hooks/useApi';
import type { RootState } from '@/store';
import type { TaskReminder } from '@/types';

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
    canUseOnlineLeads
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

  const openOnlineLeads = () => {
    setOpen(false);
    navigate('/online-leads');
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
            <span>{notificationCount} new</span>
          </div>
          <div className="reminder-list">
            {onlineLeads.map((lead) => (
              <div key={lead.id} className="reminder-item">
                <button type="button" className="reminder-item-main" onClick={openOnlineLeads}>
                  <div className="reminder-item-icon"><MousePointerClick size={15} /></div>
                  <div>
                    <strong>{lead.customerName || lead.customerPhone || lead.customerEmail || 'New online lead'}</strong>
                    <span>{lead.projectName || lead.customerCompany || 'Website submission'}</span>
                    <small>{formatReminderTime(lead.createdAt)}</small>
                  </div>
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
