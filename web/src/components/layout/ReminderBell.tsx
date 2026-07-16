import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Clock3 } from 'lucide-react';
import { useDismissReminder, useReminders } from '@/hooks/useApi';
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
  const { data: reminders = [] } = useReminders(true);
  const dismissReminder = useDismissReminder();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div className="reminder-bell" ref={ref}>
      <button
        type="button"
        className={`reminder-bell-btn ${reminders.length ? 'has-reminders' : ''}`}
        aria-label={reminders.length ? `${reminders.length} task reminder${reminders.length === 1 ? '' : 's'}` : 'Task reminders'}
        title="Task reminders"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {reminders.length > 0 && <span>{reminders.length > 9 ? '9+' : reminders.length}</span>}
      </button>

      {open && (
        <div className="reminder-menu">
          <div className="reminder-menu-head">
            <strong>Task reminders</strong>
            <span>{reminders.length} due</span>
          </div>
          <div className="reminder-list">
            {reminders.length ? reminders.map((reminder) => (
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
            )) : (
              <div className="reminder-empty">
                <Bell size={18} />
                <p>No reminders due right now.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
