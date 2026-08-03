import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, Filter, FileUp, Plus } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { TaskTable } from '@/components/tasks/TaskTable';
import { Toast } from '@/components/ui/Toast';
import { useTasks, useDeleteTask, useUsers } from '@/hooks/useApi';
import type { RootState } from '@/store';
import type { Task, TaskStatus, TaskFilters } from '@/types';
import { toInputDate } from '@/utils/date';

const STATUS_OPTIONS: (TaskStatus | 'ALL')[] = ['ALL', 'PROCESSED', 'REJECTED', 'ON_HOLD'];
const STATUS_LABELS: Record<string, string> = {
  ALL: 'All', PROCESSED: 'Processed', REJECTED: 'Rejected', ON_HOLD: 'On Hold',
};
const defaultTaskFilters = (): TaskFilters => ({
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  dateTo: toInputDate(),
});

export function TasksPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canCreateTasks = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MEMBER' || user?.role === 'CONTRIBUTOR';
  const canImportTasks = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MEMBER';
  const canDeleteTasks = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const { data: users } = useUsers(isSuperAdmin);
  const companyOptions = useMemo(
    () => Array.from(new Set((users || []).map((item) => item.company).filter(Boolean))) as string[],
    [users]
  );

  const [filters, setFilters] = useState<TaskFilters>(defaultTaskFilters);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind?: 'success' | 'error' } | null>(null);

  const { data, isLoading } = useTasks({ ...filters, search: search || undefined });
  const deleteTask = useDeleteTask();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const company = params.get('company');
    const next: TaskFilters = defaultTaskFilters();
    if (status && ['PROCESSED', 'REJECTED', 'ON_HOLD'].includes(status)) next.status = status as TaskStatus;
    if (company) next.company = company;
    if (params.has('dateFrom')) next.dateFrom = params.get('dateFrom') || undefined;
    if (params.has('dateTo')) next.dateTo = params.get('dateTo') || undefined;
    setFilters(next);
  }, [location.search]);

  useEffect(() => {
    if (isSuperAdmin && !filters.company && companyOptions.length) {
      setFilters((current) => ({ ...current, company: companyOptions[0], page: 1 }));
    }
  }, [companyOptions, filters.company, isSuperAdmin]);

  const handleDelete = (task: Task) => {
    if (confirm(`Delete "${task.title}"?`)) {
      deleteTask.mutate(task.id, {
        onSuccess: () => setToast({ text: 'Successfully done. Task deleted.', kind: 'success' }),
        onError: () => setToast({ text: 'Task could not be deleted.', kind: 'error' }),
      });
    }
  };

  return (
    <>
      <TopBar title="Task Management" onSearch={setSearch} searchValue={search} />
      <div className="page">
        <Toast open={!!toast} text={toast?.text || ''} kind={toast?.kind || 'success'} onClose={() => setToast(null)} />
        <div className="task-toolbar-shell">
          <div className="task-toolbar-top">
            <div>
              <h2 className="page-heading">Tasks</h2>
              <p className="page-desc">
                {isSuperAdmin ? 'Review tasks by company and date window.' : 'Review and manage assigned work.'}
              </p>
            </div>
            <div className="date-window date-window--toolbar">
              <div className="date-window-field">
                <input
                  aria-label="From date"
                  className="form-input"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value || undefined, page: 1 })}
                />
              </div>
              <span className="date-window-divider">-</span>
              <div className="date-window-field">
                <input
                  aria-label="To date"
                  className="form-input"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(event) => setFilters({ ...filters, dateTo: event.target.value || undefined, page: 1 })}
                />
              </div>
            </div>
          </div>

          <div className="task-toolbar">
            <div className="topbar-search" style={{ flex: 1, maxWidth: 400 }}>
              <Search size={16} color="var(--text-muted)" />
              <input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {isSuperAdmin && companyOptions.length > 0 && (
              <div className="task-company-filter">
                <select
                  className="form-input"
                  aria-label="Filter tasks by company"
                  value={filters.company || ''}
                  onChange={(event) => setFilters({ ...filters, company: event.target.value || undefined, page: 1 })}
                >
                  {companyOptions.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={16} /> Filters
            </button>
            {canCreateTasks && (
              <>
                {canImportTasks && (
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks/import')}>
                    <FileUp size={16} /> Import CSV
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/tasks/new')}>
                  <Plus size={16} /> New Task
                </button>
              </>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="chip-row" style={{ marginBottom: 16 }}>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                className={`chip ${filters.status === (s === 'ALL' ? undefined : s) || (!filters.status && s === 'ALL') ? 'active' : ''}`}
                onClick={() => setFilters({ ...filters, status: s === 'ALL' ? undefined : s, page: 1 })}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
            {(['createdAt', 'dueDate', 'priority', 'status'] as const).map((sort) => (
              <button
                key={sort}
                className={`chip ${filters.sortBy === sort ? 'active' : ''}`}
                onClick={() => setFilters({
                  ...filters,
                  sortBy: sort,
                  sortOrder: filters.sortBy === sort && filters.sortOrder === 'desc' ? 'asc' : 'desc',
                })}
              >
                {sort} {filters.sortBy === sort ? (filters.sortOrder === 'desc' ? '↓' : '↑') : ''}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <>
            <TaskTable
              tasks={data?.tasks || []}
              onRowClick={(id) => navigate(`/tasks/${id}`)}
              onEdit={(task) => navigate(`/tasks/${task.id}/edit`)}
              onDelete={canDeleteTasks ? handleDelete : undefined}
              showActions
            />
            {data && data.pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
                <button className="btn btn-outline btn-sm" disabled={filters.page === 1}
                  onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}>Previous</button>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <button className="btn btn-outline btn-sm" disabled={filters.page === data.pagination.totalPages}
                  onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
