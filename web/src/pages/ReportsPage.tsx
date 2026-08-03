import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { FileSpreadsheet, FileDown } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { TaskTable } from '@/components/tasks/TaskTable';
import { useCompanies, useCompany, useTasks } from '@/hooks/useApi';
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

function formatDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function describeTaskUpdate(task: Task) {
  const latestProgress = task.progress?.[0];
  const changes: string[] = [];
  if (latestProgress) {
    changes.push(`Status updated to ${latestProgress.status}`);
    if (latestProgress.remarks) changes.push(`Remarks: ${latestProgress.remarks}`);
  } else if (task.status === 'PROCESSED') {
    changes.push('Marked as processed');
  } else if (task.updatedAt) {
    changes.push('Task details updated');
  }
  if (task.remarks && !changes.some((change) => change.includes(task.remarks || ''))) {
    changes.push(`Current remarks: ${task.remarks}`);
  }
  return changes.join(' | ') || 'No update details';
}

export function ReportsPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isAdminReport = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isContributor = user?.role === 'CONTRIBUTOR' || user?.role === 'SALES_TEAM' || user?.role === 'HR_TEAM';
  const isViewer = user?.role === 'VIEWER';
  const canViewReports = isAdminReport || isContributor || isViewer;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const today = useMemo(() => toInputDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [scope, setScope] = useState<'day' | 'all'>('all');
  const [dayViewActive, setDayViewActive] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(user?.company || '');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  useEffect(() => {
    setSelectedDate(today);
  }, [today]);

  const { data: companies } = useCompanies();
  const reportCompany = isSuperAdmin ? selectedCompany || companies?.[0]?.name : user?.company;
  const { data: companyDetail } = useCompany(user?.company);
  const range = useMemo(() => dayRange(selectedDate), [selectedDate]);
  const adminEntireFilters: TaskFilters = {
    page: 1,
    limit: 10000,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    company: reportCompany || undefined,
    dateFrom: reportDateFrom || undefined,
    dateTo: reportDateTo || undefined,
  };
  const adminUpdatedFilters: TaskFilters = {
    page: 1,
    limit: 10000,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    company: reportCompany || undefined,
    updatedFrom: reportDateFrom || undefined,
    updatedTo: reportDateTo || undefined,
  };
  const contributorFilters: TaskFilters = scope === 'day'
    ? { limit: 1000, sortBy: 'createdAt', sortOrder: 'desc', company: user?.company || undefined, dateFrom: range.dateFrom, dateTo: range.dateTo }
    : { limit: 1000, sortBy: 'createdAt', sortOrder: 'desc', company: user?.company || undefined };
  const { data: reportData, isLoading } = useTasks(
    isAdminReport ? adminEntireFilters : contributorFilters,
    isAdminReport || isContributor
  );
  const { data: updatedReportData, isLoading: isUpdatedLoading } = useTasks(adminUpdatedFilters, isAdminReport);

  const baseTasks: Task[] = isViewer
    ? ((companyDetail?.tasks || []) as Task[])
    : ((reportData?.tasks || []) as Task[]);

  const tasks = baseTasks.filter((task) => {
    if (isAdminReport) return true;
    if (isViewer) {
      if (scope === 'all') return true;
      const created = toInputDate(new Date(task.createdAt));
      return created === selectedDate;
    }
    return task.assignee?.id === user?.id || task.assignedTo === user?.id;
  });

  const updatedTasksSource: Task[] = isAdminReport ? ((updatedReportData?.tasks || []) as Task[]) : tasks;
  const updatedTasks = updatedTasksSource.filter((task) => {
    const createdAt = new Date(task.createdAt).getTime();
    const updatedAt = task.updatedAt ? new Date(task.updatedAt).getTime() : createdAt;
    return task.status === 'PROCESSED' || Math.abs(updatedAt - createdAt) > 1000;
  });

  const buildExportRows = (items: Task[]) => items.map((task) => ({
    Date: new Date(task.createdAt).toLocaleDateString(),
    Time: new Date(task.createdAt).toLocaleTimeString(),
    UpdatedDate: task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : '',
    UpdatedTime: task.updatedAt ? new Date(task.updatedAt).toLocaleTimeString() : '',
    LatestProgressAt: formatDateTime(task.progress?.[0]?.updatedAt),
    UpdatedBy: task.progress?.[0]?.updater?.name || '',
    WhatUpdated: describeTaskUpdate(task),
    Task: task.title,
    Customer: task.customerName || '',
    Email: task.customerEmail || '',
    Phone: task.customerPhone || '',
    Company: task.customerCompany || task.company || '',
    Priority: task.priority,
    Status: task.status,
    Department: task.department || '',
    Remarks: task.remarks || '',
    AssignedTo: task.assignee?.name || '',
    AssignedToEmail: task.assignee?.email || '',
    AssignedDepartment: task.assignee?.department || task.department || '',
  }));

  const emptyRow = {
    Date: '', Time: '', UpdatedDate: '', UpdatedTime: '', LatestProgressAt: '', UpdatedBy: '', WhatUpdated: '', Task: '', Customer: '', Email: '', Phone: '', Company: '', Priority: '', Status: '', Department: '', Remarks: '', AssignedTo: '', AssignedToEmail: '', AssignedDepartment: '',
  };

  const downloadCsv = (items = tasks, name = `reports-${scope === 'day' ? selectedDate : 'all'}`) => {
    const exportRows = buildExportRows(items);
    const headers = Object.keys(exportRows[0] || {
      ...emptyRow,
    });
    const csv = [
      headers.join(','),
      ...exportRows.map((row) => headers.map((key) => `"${formatValue(row[key as keyof typeof row]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = (items = tasks, name = `reports-${scope === 'day' ? selectedDate : 'all'}`) => {
    const exportRows = buildExportRows(items);
    const headers = Object.keys(exportRows[0] || {
      ...emptyRow,
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
    a.download = `${name}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const safeCompanyName = (reportCompany || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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

  if (isAdminReport) {
    return (
      <>
        <TopBar title="Reports" />
        <div className="page">
          <div className="page-header">
            <div>
              <h2 className="page-heading">Reports</h2>
            </div>
            <div className="report-controls">
              {isSuperAdmin && (
                <div className="report-day-picker">
                  <span>Company</span>
                  <select
                    className="form-input"
                    value={reportCompany || ''}
                    onChange={(event) => setSelectedCompany(event.target.value)}
                  >
                    {(companies || []).map((company) => (
                      <option key={company.id} value={company.name}>{company.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="report-day-picker">
                <span>From</span>
                <input
                  className="form-input"
                  type="date"
                  value={reportDateFrom}
                  onChange={(event) => setReportDateFrom(event.target.value)}
                />
              </div>
              <div className="report-day-picker">
                <span>To</span>
                <input
                  className="form-input"
                  type="date"
                  value={reportDateTo}
                  onChange={(event) => setReportDateTo(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="card stat-card">
              <div className="stat-label">Updated tasks</div>
              <div className="stat-value">{updatedTasks.length}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Entire tasks</div>
              <div className="stat-value">{tasks.length}</div>
            </div>
          </div>

          <div className="task-edit-grid" style={{ marginBottom: 16 }}>
            <section className="card task-detail-card">
              <div className="section-header">
                <div>
                  <h3 className="section-title">Updated Tasks</h3>
                  <span className="task-comments-sub">{isUpdatedLoading ? 'Loading...' : `${updatedTasks.length} tasks`}</span>
                </div>
              </div>
              <div className="task-edit-actions" style={{ justifyContent: 'flex-start' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => downloadCsv(updatedTasks, `${safeCompanyName}-updated-tasks`)}
                  disabled={!updatedTasks.length}
                >
                  <FileDown size={16} /> CSV
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => downloadExcel(updatedTasks, `${safeCompanyName}-updated-tasks`)}
                  disabled={!updatedTasks.length}
                >
                  <FileSpreadsheet size={16} /> Excel
                </button>
              </div>
            </section>

            <section className="card task-detail-card">
              <div className="section-header">
                <div>
                  <h3 className="section-title">Entire Tasks</h3>
                  <span className="task-comments-sub">{tasks.length} total tasks</span>
                </div>
              </div>
              <div className="task-edit-actions" style={{ justifyContent: 'flex-start' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => downloadCsv(tasks, `${safeCompanyName}-entire-tasks`)}
                  disabled={!tasks.length}
                >
                  <FileDown size={16} /> CSV
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => downloadExcel(tasks, `${safeCompanyName}-entire-tasks`)}
                  disabled={!tasks.length}
                >
                  <FileSpreadsheet size={16} /> Excel
                </button>
              </div>
            </section>
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
            <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv()} disabled={!tasks.length}>
              <FileDown size={16} /> CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => downloadExcel()} disabled={!tasks.length}>
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
