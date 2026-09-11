import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isAxiosError } from 'axios';
import { CheckCircle2, MousePointerClick, UserCheck } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Toast } from '@/components/ui/Toast';
import { useAssignOnlineLead, useCompanies, useOnlineLeads, useUsers } from '@/hooks/useApi';
import type { RootState } from '@/store';
import type { Task, User } from '@/types';
import { markOnlineLeadsSeen } from '@/utils/onlineLeadSeen';

const KNOWN_PROJECT_FILTERS: Record<string, Array<{ value: string; label: string }>> = {
  indhuinfra: [
    { value: 'signaturevillas', label: 'Signature Villas' },
    { value: 'visionary-city', label: 'Visionary City' },
  ],
  komuinfra: [
    { value: 'shades-of-green', label: 'Shades of Green' },
  ],
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeKey(value?: string | null) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';
}

function projectKey(lead: Task) {
  const project = normalizeKey(lead.projectName || lead.customerCompany);
  const source = normalizeKey(lead.remarks || lead.customerSource || lead.description);

  if (project.includes('signature') || source.includes('signaturevillas')) return 'signaturevillas';
  if (project.includes('visionary') || source.includes('visionarycity')) return 'visionary-city';
  return 'other';
  if (project.includes('shades') || source.includes('shadesofgreen')) return 'shades-of-green';
  return project || 'other';
}

export function OnlineLeadsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canUseOnlineLeads = isSuperAdmin || user?.role === 'ADMIN';
  const { data: companies } = useCompanies();
  const [company, setCompany] = useState(user?.company || '');
  const defaultCompany = companies?.find((item) => normalizeKey(item.name) === 'komuinfra')?.name || companies?.find((item) => normalizeKey(item.name) === 'indhuinfra')?.name || companies?.find((item) => item.name !== 'Platform')?.name;
  const effectiveCompany = isSuperAdmin ? company || defaultCompany : user?.company;
  const { data: leads = [], isLoading } = useOnlineLeads(effectiveCompany);
  const { data: users = [] } = useUsers(canUseOnlineLeads);
  const assignLead = useAssignOnlineLead();
  const companyKey = normalizeKey(effectiveCompany);

  const projectFilterOptions = useMemo(() => {
    const known = KNOWN_PROJECT_FILTERS[companyKey] || [];
    const options = [{ value: 'all', label: 'All Online Leads' }, ...known];
    leads.forEach((lead) => {
      const pKey = projectKey(lead);
      if (pKey && pKey !== 'other' && !options.some((opt) => opt.value === pKey)) {
        const rawLabel = lead.projectName || lead.customerCompany || pKey;
        options.push({ value: pKey, label: rawLabel });
      }
    });
    return options;
  }, [companyKey, leads]);

  const [projectFilter, setProjectFilter] = useState(() => {
    const project = searchParams.get('project') || 'all';
    return project;
  });
  const [selectedAssignees, setSelectedAssignees] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ text: string; kind?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (projectFilter !== 'all' && !projectFilterOptions.some((opt) => opt.value === projectFilter)) {
      setProjectFilter('all');
      setSearchParams({});
    }
  }, [projectFilter, projectFilterOptions, setSearchParams]);

  const assignableUsers = useMemo(
    () => users.filter((item: User) =>
      item.isActive &&
      item.company === effectiveCompany &&
      ['MEMBER', 'CONTRIBUTOR', 'SALES_TEAM', 'HR_TEAM'].includes(item.role)
    ),
    [effectiveCompany, users]
  );

  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    leads.forEach((lead) => {
      const key = projectKey(lead);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(
    () => projectFilter === 'all' ? leads : leads.filter((lead) => projectKey(lead) === projectFilter),
    [leads, projectFilter]
  );
  const unassignedCount = filteredLeads.filter((lead) => !lead.assignedTo).length;
  const assignedCount = filteredLeads.length - unassignedCount;
  const groupedLeads = useMemo(() => {
    const groups = new Map<string, Task[]>();

    filteredLeads.forEach((lead) => {
      const project = lead.projectName || lead.customerCompany || 'Website submissions';
      const existing = groups.get(project) || [];
      existing.push(lead);
      groups.set(project, existing);
    });

    return Array.from(groups.entries()).map(([project, items]) => ({
      project,
      leads: items,
    }));
  }, [filteredLeads]);

  useEffect(() => {
    if (!canUseOnlineLeads || isLoading || !leads.length) return;
    markOnlineLeadsSeen(leads, user?.id, effectiveCompany);
  }, [canUseOnlineLeads, effectiveCompany, isLoading, leads, user?.id]);

  const selectProjectFilter = (value: string) => {
    setProjectFilter(value);
    if (value === 'all') setSearchParams({});
    else setSearchParams({ project: value });
  };

  const handleAssign = (lead: Task) => {
    const assignedTo = selectedAssignees[lead.id];
    if (!assignedTo) {
      setToast({ text: 'Select a member or contributor first.', kind: 'error' });
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
            <p className="page-desc">Website submissions arrive here as lead tasks. Assign them to team members for follow-up.</p>
          </div>
          {isSuperAdmin && (
            <select
              className="form-input page-filter"
              value={effectiveCompany || ''}
              onChange={(event) => {
                setCompany(event.target.value);
                setProjectFilter('all');
                setSearchParams({});
              }}
            >
              {(companies || []).filter((item) => item.name !== 'Platform').map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          )}
        </div>

        {projectFilterOptions.length > 1 && (
          <div className="online-lead-project-filter" aria-label={`Filter ${effectiveCompany} online leads by project`}>
            {projectFilterOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                className={projectFilter === item.value ? 'active' : ''}
                onClick={() => selectProjectFilter(item.value)}
              >
                <span>{item.label}</span>
                <strong>{projectCounts[item.value] || 0}</strong>
              </button>
            ))}
          </div>
        )}

        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="card stat-card">
            <MousePointerClick size={20} color="var(--primary)" />
            <div className="stat-label">Online leads</div>
            <div className="stat-value">{filteredLeads.length}</div>
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
              <span className="task-comments-sub">{isLoading ? 'Loading...' : `${filteredLeads.length} website submissions`}</span>
            </div>
          </div>

          <div className="online-lead-list">
            {groupedLeads.map((group) => (
              <Fragment key={group.project}>
                <div className="online-lead-group">
                  <div>
                    <h4>{group.project}</h4>
                    <span>{group.leads.length} lead{group.leads.length === 1 ? '' : 's'}</span>
                  </div>
                </div>

                {group.leads.map((lead) => (
                  <div key={lead.id} className="online-lead-row">
                    <button type="button" className="online-lead-main" onClick={() => navigate(`/tasks/${lead.id}`)}>
                      <div>
                        <div className="online-lead-title">{lead.customerName || lead.customerPhone || lead.customerEmail || 'Website visitor'}</div>
                        <div className="online-lead-sub">
                          {[lead.customerPhone, lead.customerEmail, lead.projectName || lead.customerCompany, lead.department].filter(Boolean).join(' · ')}
                          {[
                            lead.customerPhone,
                            lead.customerEmail,
                            lead.projectName || lead.customerCompany,
                            lead.remarks?.includes('Meta Ads') ? 'Meta Ads' : lead.department,
                          ].filter(Boolean).join(' · ')}
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
                        <option value="">Select employee</option>
                        {assignableUsers.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name} · {employee.department || 'Team'} · {employee.role.replace('_', ' ')}
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
              </Fragment>
            ))}
            {!filteredLeads.length && (
              <div className="empty-state card" style={{ margin: 0 }}>
                <h3>No online leads yet</h3>
                <p>Website form submissions for this selection will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
