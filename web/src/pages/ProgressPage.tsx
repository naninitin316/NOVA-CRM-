import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CheckCircle } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { TaskTable } from '@/components/tasks/TaskTable';
import { useTasks, useUsers } from '@/hooks/useApi';
import type { RootState } from '@/store';

export function ProgressPage() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { data: users } = useUsers();
  const companyOptions = useMemo(
    () => Array.from(new Set((users || []).map((item) => item.company).filter(Boolean))) as string[],
    [users]
  );
  const [company, setCompany] = useState(user?.company || '');
  useEffect(() => {
    if (isSuperAdmin && !company && companyOptions.length) setCompany(companyOptions[0]);
  }, [company, companyOptions, isSuperAdmin]);

  const effectiveCompany = isSuperAdmin ? company : user?.company;
  const { data: processedTasks, isLoading } = useTasks({
    status: 'PROCESSED',
    limit: 50,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    company: effectiveCompany,
  });

  return (
    <>
      <TopBar title="Progress" />
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-heading">Processed Tasks</h2>
            <p className="page-desc">Only tasks marked processed are shown here.</p>
          </div>
          {isSuperAdmin && companyOptions.length > 0 && (
            <div className="page-filter">
              <label className="form-label" style={{ marginBottom: 6 }}>Company</label>
              <select className="form-input" value={company} onChange={(e) => setCompany(e.target.value)}>
                {companyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={18} color="var(--success)" />
              <h3 className="section-title" style={{ marginBottom: 0 }}>Processed Only</h3>
            </div>
            <span className="task-comments-sub">
              {isLoading ? 'Loading...' : `${processedTasks?.pagination.total || 0} tasks`}
            </span>
          </div>
          <TaskTable
            tasks={processedTasks?.tasks || []}
            onRowClick={(id) => navigate(`/tasks/${id}`)}
          />
        </div>
      </div>
    </>
  );
}
