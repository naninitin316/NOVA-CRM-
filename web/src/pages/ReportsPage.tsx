import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { FileSpreadsheet, FileDown } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { TaskTable } from '@/components/tasks/TaskTable';
import { useCompany, useTasks } from '@/hooks/useApi';
import type { RootState } from '@/store';
import type { Task, TaskFilters } from '@/types';

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayRange(dateString: string) {
  const start = new Date(`${dateString}T00:00:00`);
  const end = new Date(`${dateString}T23:59:59.999`);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

function formatValue(value: unknown) {
  if (value == null) return '';
  return String(value);
}

function escapeHtml(value: unknown) {
  return formatValue(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function ReportsPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isContributor = user?.role === 'CONTRIBUTOR' || user?.role === 'SALES_TEAM' || user?.role === 'HR_TEAM';
  const isViewer = user?.role === 'VIEWER';
  const canViewReports = isContributor || isViewer;
  const today = useMemo(() => toInputDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [scope, setScope] = useState<'day' | 'all'>('all');
  const [dayViewActive, setDayViewActive] = useState(false);

  useEffect(() => {
    setSelectedDate(today);
  }, [today]);

  const { data: companyDetail } = useCompany(user?.company);
  const range = useMemo(() => dayRange(selectedDate), [selectedDate]);
  const contributorFilters: TaskFilters = scope === 'day'
    ? { limit: 1000, sortBy: 'createdAt', sortOrder: 'desc', company: user?.company || undefined, dateFrom: range.dateFrom, dateTo: range.dateTo }
    : { limit: 1000, sortBy: 'createdAt', sortOrder: 'desc', company: user?.company || undefined };
  const { data: contributorData, isLoading } = useTasks(isContributor ? contributorFilters : undefined);

  const baseTasks: Task[] = isViewer
    ? ((companyDetail?.tasks || []) as Task[])
    : ((contributorData?.tasks || []) as Task[]);

  const tasks = baseTasks.filter((task) => {
    if (isViewer) {
      if (scope === 'all') return true;
      const created = toInputDate(new Date(task.createdAt));
      return created === selectedDate;
    }
    return task.assignee?.id === user?.id || task.assignedTo === user?.id;
  });

  const exportRows = tasks.map((task) => ({
    Date: new Date(task.createdAt).toLocaleDateString(),
    Time: new Date(task.createdAt).toLocaleTimeString(),
    Task: task.title,
    Customer: task.customerName || '',
    Email: task.customerEmail || '',
    Phone: task.customerPhone || '',
    Company: task.customerCompany || task.company || '',
    Priority: task.priority,
    Status: task.status,
    Department: task.department || '',
    Remarks: task.remarks || '',
    Assignee: task.assignee?.name || '',
  }));

  const downloadCsv = () => {
    const headers = Object.keys(exportRows[0] || {
      Date: '', Time: '', Task: '', Customer: '', Email: '', Phone: '', Company: '', Priority: '', Status: '', Department: '', Remarks: '', Assignee: '',
    });
    const csv = [
      headers.join(','),
      ...exportRows.map((row) => headers.map((key) => `"${formatValue(row[key as keyof typeof row]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${scope === 'day' ? selectedDate : 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const headers = Object.keys(exportRows[0] || {
      Date: '', Time: '', Task: '', Customer: '', Email: '', Phone: '', Company: '', Priority: '', Status: '', Department: '', Remarks: '', Assignee: '',
    });
    const table = [
      '<table><thead><tr>',
      ...headers.map((header) => `<th>${escapeHtml(header)}</th>`),
      '</tr></thead><tbody>',
      ...exportRows.map((row) => [
        '<tr>',
        ...headers.map((key) => `<td>${escapeHtml(row[key as keyof typeof row])}</td>`),
        '</tr>',
      ].join('')),
      '</tbody></table>',
    ].join('');
    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${table}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${scope === 'day' ? selectedDate : 'all'}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showTodaysTasks = () => {
    setSelectedDate(today);
    setScope('day');
    setDayViewActive(true);
  };

  if (!canViewReports) {
    return (
      <>
        <TopBar title="Reports" />
        <div className="page">
          <div className="card" style={{ maxWidth: 560 }}>
            <h2 className="page-heading" style={{ marginBottom: 8 }}>Reports</h2>
            <p className="page-desc">This module is available to contributors and viewers only.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Reports" />
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-heading">Reports</h2>
            <p className="page-desc">
              {isViewer
                ? 'Review company tasks and download them as CSV or Excel.'
                : 'Review your assigned tasks and download them as CSV or Excel.'}
            </p>
          </div>
          <div className="report-controls">
            <button
              type="button"
              className={`report-text-action ${dayViewActive ? 'active' : ''}`}
              onClick={showTodaysTasks}
            >
              Day View
            </button>
            <div className="report-day-picker">
              <span>Day</span>
              <input
                className="form-input"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setScope('day');
                  setDayViewActive(false);
                }}
              />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={downloadCsv} disabled={!tasks.length}>
              <FileDown size={16} /> CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={downloadExcel} disabled={!tasks.length}>
              <FileSpreadsheet size={16} /> Excel
            </button>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="card stat-card">
            <div className="stat-label">{scope === 'all' ? (isViewer ? 'Company tasks' : 'Assigned tasks') : 'Tasks for day'}</div>
            <div className="stat-value">{tasks.length}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Current view</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{scope === 'all' ? 'All tasks' : "Today's tasks"}</div>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Task Preview</h3>
            <span className="task-comments-sub">{isLoading ? 'Loading...' : `${tasks.length} tasks`}</span>
          </div>
          <TaskTable tasks={tasks} showActions={false} />
        </div>
      </div>
    </>
  );
}
