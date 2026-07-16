import { Pencil, Trash2 } from 'lucide-react';
import type { Task } from '@/types';
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

interface TaskTableProps {
  tasks: Task[];
  onRowClick?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  showActions?: boolean;
}

export function TaskTable({ tasks, onRowClick, onEdit, onDelete, showActions }: TaskTableProps) {
  if (!tasks.length) {
    return (
      <div className="empty-state card">
        <h3>No tasks found</h3>
        <p>Try adjusting your filters or create a new task</p>
      </div>
    );
  }

  return (
    <div className="table-wrap card table-card">
      <table className="table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due Date</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const status = STATUS_STYLES[task.status];
            const priority = PRIORITY_STYLES[task.priority];
            const whatsappUrl = getWhatsAppUrl(task.customerPhone);
            return (
              <tr
                key={task.id}
                onClick={() => onRowClick?.(task.id)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                <td>
                  <div className="td-title">{task.title}</div>
                  {(task.customerName || task.customerPhone || task.department) && (
                    <div className="td-sub">
                      {task.customerName && <span>{task.customerName}</span>}
                      {task.customerPhone && (
                        <>
                          {task.customerName && <span> · </span>}
                          {whatsappUrl ? (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ textDecoration: 'underline' }}
                              aria-label={`Open WhatsApp chat for ${task.customerPhone}`}
                            >
                              {task.customerPhone}
                            </a>
                          ) : (
                            <span>{task.customerPhone}</span>
                          )}
                        </>
                      )}
                      {task.department && (
                        <>
                          {(task.customerName || task.customerPhone) && <span> · </span>}
                          <span>{task.department}</span>
                        </>
                      )}
                    </div>
                  )}
                </td>
                <td>{task.assignee?.name || '—'}</td>
                <td>
                  <span className="badge" style={{ background: status.bg, color: status.color }}>
                    {status.label}
                  </span>
                </td>
                <td>
                  <span className="badge" style={{ background: priority.bg, color: priority.color }}>
                    {task.priority}
                  </span>
                </td>
                <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</td>
                {showActions && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="table-action-row">
                      {onEdit && (
                        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)}>
                          <Pencil size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button className="btn btn-ghost btn-sm btn-icon-danger" onClick={() => onDelete(task)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
