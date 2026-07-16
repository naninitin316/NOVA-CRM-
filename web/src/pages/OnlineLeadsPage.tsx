import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isAxiosError } from 'axios';
import { CheckCircle2, MousePointerClick, UserCheck } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Toast } from '@/components/ui/Toast';
import { useAssignOnlineLead, useCompanies, useOnlineLeads, useUsers } from '@/hooks/useApi';
import type { RootState } from '@/store';
import type { Task, User } from '@/types';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OnlineLeadsPage() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canUseOnlineLeads = isSuperAdmin || user?.role === 'ADMIN' || user?.role === 'MEMBER';
  const { data: companies } = useCompanies();
  const [company, setCompany] = useState(user?.company || '');
  const effectiveCompany = isSuperAdmin ? company || companies?.[0]?.name : user?.company;
  const { data: leads = [], isLoading } = useOnlineLeads(effectiveCompany);
  const { data: users = [] } = useUsers(canUseOnlineLeads);
  const assignLead = useAssignOnlineLead();
  const [selectedAssignees, setSelectedAssignees] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ text: string; kind?: 'success' | 'error' } | null>(null);

  const contributors = useMemo(
    () => users.filter((item: User) =>
      item.isActive &&
      item.company === effectiveCompany &&
      ['CONTRIBUTOR', 'SALES_TEAM', 'HR_TEAM'].includes(item.role)
    ),
    [effectiveCompany, users]
  );

  const unassignedCount = leads.filter((lead) => !lead.assignedTo).length;
  const assignedCount = leads.length - unassignedCount;

  const handleAssign = (lead: Task) => {
    const assignedTo = selectedAssignees[lead.id];
    if (!assignedTo) {
      setToast({ text: 'Select a contributor first.', kind: 'error' });
      return;
    }

    assignLead.mutate(
      { id: lead.id, assignedTo },
      {
        onSuccess: () => {
          setToast({ text: 'Successfully done. Online lead assigned.', kind: 'success' });
          setSelectedAssignees((current) => ({ ...current, [lead.id]: '' }));
        },
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Lead could not be assigned.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  if (!canUseOnlineLeads) {
    return (
      <>
        <TopBar title="Online Leads" />
        <div className="page">
          <div className="card" style={{ maxWidth: 560 }}>
            <h2 className="page-heading" style={{ marginBottom: 8 }}>Online Leads</h2>
            <p className="page-desc">This module is available to admins and members.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Online Leads" />
      <div className="page">
        <Toast open={!!toast} text={toast?.text || ''} kind={toast?.kind || 'success'} onClose={() => setToast(null)} />
        <div className="page-header">
          <div>
            <h2 className="page-heading">Online Leads</h2>
            <p className="page-desc">Website submissions arrive here as lead tasks. Assign them to contributors for follow-up.</p>
          </div>
          {isSuperAdmin && (
            <select className="form-input page-filter" value={effectiveCompany || ''} onChange={(event) => setCompany(event.target.value)}>
              {(companies || []).filter((item) => item.name !== 'Platform').map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="card stat-card">
            <MousePointerClick size={20} color="var(--primary)" />
            <div className="stat-label">Online leads</div>
            <div className="stat-value">{leads.length}</div>
          </div>
          <div className="card stat-card">
            <UserCheck size={20} color="var(--warning)" />
            <div className="stat-label">Unassigned</div>
            <div className="stat-value">{unassignedCount}</div>
          </div>
          <div className="card stat-card">
            <CheckCircle2 size={20} color="var(--success)" />
            <div className="stat-label">Assigned</div>
            <div className="stat-value">{assignedCount}</div>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <div>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Lead Queue</h3>
              <span className="task-comments-sub">{isLoading ? 'Loading...' : `${leads.length} website submissions`}</span>
            </div>
          </div>

          <div className="online-lead-list">
            {leads.map((lead) => (
              <div key={lead.id} className="online-lead-row">
                <button type="button" className="online-lead-main" onClick={() => navigate(`/tasks/${lead.id}`)}>
                  <div>
                    <div className="online-lead-title">{lead.customerName || lead.customerPhone || lead.customerEmail || 'Website visitor'}</div>
                    <div className="online-lead-sub">
                      {[lead.customerPhone, lead.customerEmail, lead.customerCompany, lead.department].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="online-lead-meta">
                    <span>{formatDateTime(lead.createdAt)}</span>
                    <strong>{lead.assignee?.name || 'Unassigned'}</strong>
                  </div>
                </button>

                <div className="online-lead-actions">
                  <select
                    className="form-input"
                    value={selectedAssignees[lead.id] || lead.assignedTo || ''}
                    onChange={(event) => setSelectedAssignees((current) => ({ ...current, [lead.id]: event.target.value }))}
                  >
                    <option value="">Select contributor</option>
                    {contributors.map((contributor) => (
                      <option key={contributor.id} value={contributor.id}>
                        {contributor.name} · {contributor.department || 'Team'}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    type="button"
                    disabled={assignLead.isPending}
                    onClick={() => handleAssign(lead)}
                  >
                    Assign
                  </button>
                </div>
              </div>
            ))}
            {!leads.length && (
              <div className="empty-state card" style={{ margin: 0 }}>
                <h3>No online leads yet</h3>
                <p>Website form submissions will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
