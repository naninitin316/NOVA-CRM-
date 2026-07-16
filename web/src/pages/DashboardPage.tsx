import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Layers, CheckCircle, PauseCircle, XCircle, ListTodo, BarChart3, Settings, FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { TopBar } from '@/components/layout/TopBar';
import { TaskTable } from '@/components/tasks/TaskTable';
import { useAnalytics, useCompanies, useCompany, useTasks } from '@/hooks/useApi';
import { useChartTheme } from '@/hooks/useChartTheme';
import type { RootState } from '@/store';
import { toInputDate } from '@/utils/date';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function ProgressBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div className="progress-bar-row">
      <span className="progress-bar-label">{label}</span>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percentage}%`, background: color }} />
      </div>
      <span className="progress-bar-value">{percentage}%</span>
    </div>
  );
}

function buildTasksPath(company: string | undefined, status?: string, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (company) params.set('company', company);
  if (status) params.set('status', status);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  const query = params.toString();
  return query ? `/tasks?${query}` : '/tasks';
}

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { data: companies } = useCompanies();
  const companyOptions = useMemo(
    () => (companies || []).map((item) => item.name),
    [companies]
  );
  const [company, setCompany] = useState(user?.company || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(toInputDate());

  useEffect(() => {
    if (isSuperAdmin && !company && companyOptions.length) {
      setCompany(companyOptions[0]);
    }
  }, [company, companyOptions, isSuperAdmin]);

  const effectiveCompany = isSuperAdmin ? company : user?.company;
  const dateFilters = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };
  const { data: analytics, isLoading } = useAnalytics({ company: effectiveCompany, ...dateFilters });
  const { data: tasksData } = useTasks({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc', company: effectiveCompany, ...dateFilters });
  const { data: companyDetail } = useCompany(effectiveCompany);
  const { tooltipStyle, axisColor } = useChartTheme();

  const overview = analytics?.overview;
  const monthlyData = (analytics?.monthlyPerformance || []).map((m) => ({
    name: m.month,
    Processed: m.processed,
    Rejected: m.rejected,
    'On Hold': m.onHold,
  }));
  const statusData = (analytics?.statusDistribution || []).map((s) => ({
    name: s.status.replace('_', ' '),
    value: s.count,
    color: s.color,
  }));
  const priorityColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444'];
  const priorityData = (analytics?.priorityDistribution || []).map((p, i) => ({
    name: p.priority,
    value: p.count,
    color: priorityColors[i],
  }));
  const previewTasks = user?.role === 'VIEWER'
    ? (tasksData?.tasks?.length ? tasksData.tasks : companyDetail?.recentTasks || [])
    : (tasksData?.tasks || []);
  const quickActions = user?.role === 'VIEWER'
    ? [
        { icon: FileSpreadsheet, label: 'Reports', sub: 'Download company tasks', color: 'var(--secondary)', bg: 'var(--info-bg)', path: '/reports' },
        { icon: Settings, label: 'Settings', sub: 'Profile & preferences', color: 'var(--accent)', bg: 'rgba(167,139,250,0.12)', path: '/settings' },
      ]
    : [
        { icon: ListTodo, label: 'View Tasks', sub: 'Manage all tasks', color: 'var(--primary)', bg: 'var(--primary-subtle)', path: '/tasks' },
        { icon: BarChart3, label: 'Analytics', sub: 'View performance', color: 'var(--secondary)', bg: 'var(--info-bg)', path: '/progress' },
        { icon: Settings, label: 'Settings', sub: 'Profile & preferences', color: 'var(--accent)', bg: 'rgba(167,139,250,0.12)', path: '/settings' },
      ];

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="page dashboard-page">
        <div className="page-header dashboard-hero">
          <div className="dashboard-header-copy">
            <h2 className="page-heading">
              Good {getGreeting()}, {user?.name?.split(' ')[0]}
            </h2>
            <div className="company-page-badge">
              <span>{isSuperAdmin ? 'Selected company' : 'Company'}</span>
              <strong>{effectiveCompany || 'All companies'}</strong>
            </div>
          </div>
          <div className="dashboard-header-tools">
            {isSuperAdmin && companyOptions.length > 0 && (
              <div className="page-filter">
                <label className="form-label" style={{ marginBottom: 6 }}>Company</label>
                <select className="form-input" value={company} onChange={(e) => setCompany(e.target.value)}>
                  {companyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            )}
            <div className="date-window date-window--dashboard">
              <div className="date-window-field">
                <input
                  aria-label="From date"
                  className="form-input"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>
              <span className="date-window-divider">-</span>
              <div className="date-window-field">
                <input
                  aria-label="To date"
                  className="form-input"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <>
            <div className="stats-grid">
              <button type="button" className="card stat-card stat-card--primary stat-card--clickable" onClick={() => navigate(buildTasksPath(effectiveCompany, undefined, dateFrom, dateTo))}>
                <div className="stat-card-header">
                  <div className="stat-icon" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
                    <Layers size={20} />
                  </div>
                </div>
                <div className="stat-label">Total Tasks</div>
                <div className="stat-value">{overview?.total || 0}</div>
                <div className="stat-sub">All tracked leads and tasks</div>
              </button>
              <button type="button" className="card stat-card stat-card--success stat-card--clickable" onClick={() => navigate(buildTasksPath(effectiveCompany, 'PROCESSED', dateFrom, dateTo))}>
                <div className="stat-card-header">
                  <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                    <CheckCircle size={20} />
                  </div>
                </div>
                <div className="stat-label">Processed</div>
                <div className="stat-value" style={{ color: 'var(--success)' }}>{overview?.processed || 0}</div>
                <div className="stat-sub">Completed follow-ups</div>
              </button>
              <button type="button" className="card stat-card stat-card--warning stat-card--clickable" onClick={() => navigate(buildTasksPath(effectiveCompany, 'ON_HOLD', dateFrom, dateTo))}>
                <div className="stat-card-header">
                  <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                    <PauseCircle size={20} />
                  </div>
                </div>
                <div className="stat-label">On Hold</div>
                <div className="stat-value" style={{ color: 'var(--warning)' }}>{overview?.onHold || 0}</div>
                <div className="stat-sub">Waiting for next action</div>
              </button>
              <button type="button" className="card stat-card stat-card--danger stat-card--clickable" onClick={() => navigate(buildTasksPath(effectiveCompany, 'REJECTED', dateFrom, dateTo))}>
                <div className="stat-card-header">
                  <div className="stat-icon" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                    <XCircle size={20} />
                  </div>
                </div>
                <div className="stat-label">Rejected</div>
                <div className="stat-value" style={{ color: 'var(--error)' }}>{overview?.rejected || 0}</div>
                <div className="stat-sub">Closed as not moving</div>
              </button>
            </div>

            <div className="dashboard-progress-grid">
              <div className="card dashboard-chart-card">
                <div className="section-header">
                  <h3 className="section-title">Business Progress</h3>
                  <span className="task-comments-sub">{effectiveCompany || 'All companies'}</span>
                </div>
                <div className="progress-overview">
                  <div className="progress-overview-head">
                    <strong>{overview?.completionPercentage || 0}% complete</strong>
                    <span>Task completion rate</span>
                  </div>
                  <div className="progress-overview-track">
                    <div className="progress-overview-fill" style={{ width: `${overview?.completionPercentage || 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="card dashboard-chart-card">
                <h3 className="chart-card-title">Monthly Performance</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="Processed" fill="var(--success)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Rejected" fill="var(--error)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="On Hold" fill="var(--warning)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card dashboard-chart-card">
                <h3 className="chart-card-title">Task Distribution</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={64} outerRadius={92} dataKey="value" paddingAngle={4}>
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="charts-grid">
              <div className="card dashboard-chart-card">
                <h3 className="chart-card-title">Priority Analytics</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={64} outerRadius={92} dataKey="value" paddingAngle={4}>
                      {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="card dashboard-chart-card">
                <h3 className="chart-card-title">Department Performance</h3>
                {(analytics?.departmentPerformance || []).map((d) => (
                  <ProgressBar key={d.department} label={d.department} percentage={d.percentage} color="var(--secondary)" />
                ))}
              </div>
            </div>

            {(analytics?.teamPerformance || []).length > 0 && (
              <div className="card dashboard-chart-card">
                <h3 className="chart-card-title">Team Performance</h3>
                {analytics!.teamPerformance.map((m) => (
                  <ProgressBar key={m.name} label={m.name} percentage={m.percentage} color="var(--accent)" />
                ))}
              </div>
            )}

            <div className="quick-actions">
              {quickActions.map(({ icon: Icon, label, sub, color, bg, path }) => (
                <div key={path} className="card card-hover quick-action" onClick={() => navigate(path)}>
                  <div className="quick-action-icon" style={{ background: bg, color }}>
                    <Icon size={22} />
                  </div>
                  <div className="quick-action-title">{label}</div>
                  <div className="quick-action-sub">{sub}</div>
                </div>
              ))}
            </div>

            <div className="section-header">
              <h3 className="section-title">Recent Tasks</h3>
              {user?.role !== 'VIEWER' && <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>See all →</button>}
            </div>
            <TaskTable
              tasks={previewTasks}
              onRowClick={(id) => navigate(`/tasks/${id}`)}
            />
          </>
        )}
      </div>
    </>
  );
}
