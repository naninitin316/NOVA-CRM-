import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Building2, ChevronRight, CircleUserRound, CheckCircle2, Plus, ArrowLeft, Trash2, Users, Power } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { useCompanies, useCompany, useCreateCompany, useDeleteCompany, useUpdateCompanyStatus, useUpdateUser } from '@/hooks/useApi';
import { isAxiosError } from 'axios';
import type { RootState } from '@/store';
import type { CompanyDetail } from '@/types';
import type { CompanyEmployeeInput } from '@/types';
import { readLogoFile } from '@/utils/image';

const STATUS_LABELS: Record<string, string> = {
  PROCESSED: 'Processed',
  REJECTED: 'Rejected',
  ON_HOLD: 'On Hold',
};

const STATUS_COLORS: Record<string, string> = {
  PROCESSED: 'var(--success)',
  REJECTED: 'var(--error)',
  ON_HOLD: 'var(--warning)',
};
const DEPARTMENT_OPTIONS = ['Sales', 'HR', 'IT', 'Administration', 'Finance', 'Engineering', 'Marketing', 'Support'] as const;

export function CompaniesPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { data: companies } = useCompanies();
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const { data: companyDetail, isLoading } = useCompany(selectedCompany);
  const createCompany = useCreateCompany();
  const updateCompanyStatus = useUpdateCompanyStatus();
  const deleteCompany = useDeleteCompany();
  const updateUser = useUpdateUser();
  const [view, setView] = useState<'list' | 'create'>('list');
  const [name, setName] = useState('');
  const [director, setDirector] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [logo, setLogo] = useState('');
  const emptyEmployee = (): CompanyEmployeeInput => ({
    name: '',
    email: '',
    password: '',
    role: 'CONTRIBUTOR',
    department: '',
    phone: '',
  });
  const [employees, setEmployees] = useState<CompanyEmployeeInput[]>([emptyEmployee()]);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!selectedCompany && companies?.length) setSelectedCompany(companies[0].name);
  }, [companies, selectedCompany]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const selectedSummary = companies?.find((item) => item.name === selectedCompany);
  const selectedDetail = companyDetail as CompanyDetail | undefined;
  const selected = selectedDetail || selectedSummary;
  const detailUsers = selectedDetail?.users || [];
  const detailTasks = selectedDetail?.recentTasks || [];

  const summary = useMemo(() => ([
    { label: 'Users', value: selected?.userCount || 0, icon: Users },
    { label: 'Active', value: selected?.activeUserCount || 0, icon: CircleUserRound },
    { label: 'Admins', value: selected?.adminCount || 0, icon: CircleUserRound },
    { label: 'Tasks', value: selected?.taskCount || 0, icon: Building2 },
    { label: 'Processed', value: selected?.processedTaskCount || 0, icon: CheckCircle2 },
  ]), [selected]);

  const resetCreateForm = () => {
    setName('');
    setDirector('');
    setGstNo('');
    setCompanyPhone('');
    setLogo('');
    setEmployees([emptyEmployee()]);
  };

  const updateEmployee = (index: number, key: keyof CompanyEmployeeInput, value: string) => {
    setEmployees((current) => current.map((employee, employeeIndex) => (
      employeeIndex === index ? { ...employee, [key]: value } : employee
    )));
  };

  const addEmployeeRow = () => setEmployees((current) => [...current, emptyEmployee()]);
  const removeEmployeeRow = (index: number) => setEmployees((current) => current.filter((_, i) => i !== index));
  const visibleEmployees = employees;
  const getApiErrorMessage = (err: unknown, fallback: string) => (
    isAxiosError(err)
      ? err.response?.data?.error || err.response?.data?.message || err.message
      : fallback
  );
  const handleToggleCompanyStatus = (companyName: string, nextStatus: boolean) => {
    const action = nextStatus ? 'enable' : 'disable';
    if (!window.confirm(`Are you sure you want to ${action} ${companyName}?`)) return;

    updateCompanyStatus.mutate({ name: companyName, isActive: nextStatus }, {
      onSuccess: () => setMessage({
        text: `${companyName} ${nextStatus ? 'enabled' : 'disabled'} successfully.`,
        kind: 'success',
      }),
      onError: (err) => setMessage({
        text: getApiErrorMessage(err, `Company could not be ${nextStatus ? 'enabled' : 'disabled'}.`),
        kind: 'error',
      }),
    });
  };
  const handleDeleteCompany = (companyName: string) => {
    if (!window.confirm(`Delete ${companyName}? This will remove its users, tasks, and support tickets. This cannot be undone.`)) return;

    deleteCompany.mutate(companyName, {
      onSuccess: () => {
        setMessage({ text: `${companyName} deleted successfully.`, kind: 'success' });
        if (selectedCompany === companyName) {
          const nextCompany = companies?.find((company) => company.name !== companyName)?.name || '';
          setSelectedCompany(nextCompany);
        }
      },
      onError: (err) => setMessage({
        text: getApiErrorMessage(err, 'Company could not be deleted.'),
        kind: 'error',
      }),
    });
  };
  const createPayload = () => ({
    name,
    director,
    gstNo,
    phone: companyPhone,
    logo: logo || undefined,
    employees: employees
      .map((employee) => ({
        ...employee,
        name: employee.name.trim(),
        email: employee.email.trim(),
        password: employee.password,
        department: employee.department?.trim() || undefined,
        phone: employee.phone?.trim(),
      }))
      .filter((employee) => employee.name || employee.email || employee.password || employee.department || employee.phone),
  });

  if (!isSuperAdmin) {
    return (
      <>
        <TopBar title="Companies" />
        <div className="page">
          <div className="card" style={{ maxWidth: 560 }}>
            <h2 className="page-heading" style={{ marginBottom: 8 }}>Companies</h2>
            <p className="page-desc">This module is available only to the super admin.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Companies" />
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-heading">Companies</h2>
            <p className="page-desc">Overview of all registered companies and their current activity.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>
            <Building2 size={16} /> Add Company
          </button>
        </div>

        {message && (
          <div
            className={`page-toast page-toast--${message.kind}`}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </div>
        )}

        {view === 'create' ? (
          <div className="task-edit-shell">
            <div className="card task-edit-header">
              <div>
                <p className="task-edit-eyebrow">Create company</p>
                <h2 className="task-detail-title">{name.trim() || 'Untitled company'}</h2>
              </div>
              <div className="task-edit-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setView('list');
                    resetCreateForm();
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!name.trim() || createCompany.isPending}
                  onClick={() =>
                    createCompany.mutate(createPayload(), {
                      onSuccess: (_res, variables) => {
                        setMessage({ text: `Company ${variables.name} created successfully.`, kind: 'success' });
                        setSelectedCompany(variables.name);
                        setView('list');
                        resetCreateForm();
                      },
                      onError: (err) => {
                        const apiMessage = isAxiosError(err)
                          ? err.response?.data?.error || err.response?.data?.message || err.message
                          : 'Company could not be created.';
                        setMessage({ text: apiMessage, kind: 'error' });
                      },
                    })
                  }
                >
                  Create Company
                </button>
              </div>
            </div>

            <div className="task-edit-grid">
              <section className="card task-detail-card">
                <h3 className="task-detail-section-title">Company Details</h3>
                <div className="form-group">
                  <label className="form-label">Company name</label>
                  <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="NR Innovium" />
                </div>
                <div className="form-group">
                  <label className="form-label">Director</label>
                  <input className="form-input" value={director} onChange={(e) => setDirector(e.target.value)} placeholder="Director name" />
                </div>
                <div className="form-group">
                  <label className="form-label">GST No</label>
                  <input className="form-input" value={gstNo} onChange={(e) => setGstNo(e.target.value)} placeholder="27ABCDE1234F1Z5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+91 98765 43210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Company logo</label>
                  <div className="company-logo-upload">
                    <div className="company-logo-preview">
                      {logo ? <img src={logo} alt={`${name || 'Company'} logo preview`} /> : <Building2 size={20} />}
                    </div>
                    <div>
                      <input
                        className="form-input"
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          readLogoFile(event.target.files?.[0])
                            .then(setLogo)
                            .catch((error) => setMessage({ text: error instanceof Error ? error.message : 'Logo could not be uploaded.', kind: 'error' }));
                        }}
                      />
                      <span className="task-comments-sub">PNG, JPG, or WEBP. Max 600 KB.</span>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="card task-detail-card">
                <div className="section-header" style={{ marginBottom: 12 }}>
                  <h3 className="task-detail-section-title" style={{ marginBottom: 0 }}>Employees</h3>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addEmployeeRow}>
                    <Plus size={14} /> Add row
                  </button>
                </div>
                <div className="task-import-preview">
                  {visibleEmployees.map((employee, index) => (
                    <div key={index} className="company-create-row">
                      <div className="company-create-grid">
                        <input className="form-input" placeholder="Name" value={employee.name} onChange={(e) => updateEmployee(index, 'name', e.target.value)} />
                        <input className="form-input" type="email" placeholder="Email" value={employee.email} onChange={(e) => updateEmployee(index, 'email', e.target.value)} />
                        <input className="form-input" type="password" placeholder="Temporary password" value={employee.password} onChange={(e) => updateEmployee(index, 'password', e.target.value)} />
                        <select className="form-input" value={employee.role} onChange={(e) => updateEmployee(index, 'role', e.target.value)}>
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                          <option value="CONTRIBUTOR">Contributor</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                        <select
                          className="form-input"
                          value={employee.department || ''}
                          onChange={(e) => updateEmployee(index, 'department', e.target.value)}
                        >
                          <option value="">Department</option>
                          {DEPARTMENT_OPTIONS.map((department) => (
                            <option key={department} value={department}>{department}</option>
                          ))}
                        </select>
                        <input className="form-input" placeholder="Phone" value={employee.phone || ''} onChange={(e) => updateEmployee(index, 'phone', e.target.value)} />
                      </div>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeEmployeeRow(index)} disabled={visibleEmployees.length === 1}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {!visibleEmployees.length && <div className="task-comments-empty">Add at least one employee row or leave it empty.</div>}
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="companies-layout">
          <div className="card">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>All Companies</h3>
              <span className="task-comments-sub">{companies?.length || 0} total</span>
            </div>
            <div className="companies-grid">
              {(companies || []).map((company) => (
                <div
                  key={company.id}
                  className={`company-card ${selectedCompany === company.name ? 'active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedCompany(company.name)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedCompany(company.name);
                    }
                  }}
                >
                  <div className="company-card-head">
                    <div className="company-card-title-row">
                      {company.logo ? (
                        <img className="dashboard-company-logo" src={company.logo} alt={`${company.name} logo`} />
                      ) : (
                        <div className="company-logo-preview company-logo-preview--sm">
                          <Building2 size={16} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="company-name">{company.name}</div>
                      <div className="company-sub">{company.userCount || 0} users · {company.activeUserCount || 0} active · {company.taskCount || 0} tasks</div>
                    </div>
                    <ChevronRight size={16} />
                  </div>
                  <div className="company-metrics">
                    <span><strong>{company.adminCount || 0}</strong> admins</span>
                    <span><strong>{company.memberCount || 0}</strong> members</span>
                    <span><strong>{company.contributorCount || 0}</strong> contributors</span>
                    <span><strong>{company.processedTaskCount || 0}</strong> processed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="company-detail-stack">
            <div className="card">
              <div className="section-header">
                <div>
                  <h3 className="section-title" style={{ marginBottom: 0 }}>
                    <span className="company-detail-title">
                      {selected?.logo && (
                        <img className="dashboard-company-logo" src={selected.logo} alt={`${selected.name} logo`} />
                      )}
                      {selected?.name || 'Select a company'}
                    </span>
                  </h3>
                <span className="task-comments-sub">
                  {isLoading ? 'Loading...' : `${selected?.userCount || 0} users and ${selected?.taskCount || 0} tasks`}
                </span>
                </div>
                <div className="company-card-actions">
                  {selected && (
                    <span
                      className="badge"
                      style={{
                        background: selected.isActive === false ? 'var(--error-bg)' : 'var(--success-bg)',
                        color: selected.isActive === false ? 'var(--error)' : 'var(--success)',
                      }}
                    >
                      {selected.isActive === false ? 'Disabled' : 'Active'}
                    </span>
                  )}
                  <Building2 size={18} color="var(--primary)" />
                </div>
              </div>

              <div className="company-task-strip" style={{ marginTop: 16 }}>
                <div><span>Director</span><strong>{selected?.director || 'Not set'}</strong></div>
                <div><span>GST No</span><strong>{selected?.gstNo || 'Not set'}</strong></div>
                <div><span>Phone</span><strong>{selected?.phone || 'Not set'}</strong></div>
              </div>

              {selected && (
                <div className="company-detail-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={updateCompanyStatus.isPending}
                    onClick={() => handleToggleCompanyStatus(selected.name, selected.isActive === false)}
                  >
                    <Power size={14} /> {selected.isActive === false ? 'Enable Company' : 'Disable Company'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-icon-danger"
                    disabled={deleteCompany.isPending}
                    onClick={() => handleDeleteCompany(selected.name)}
                  >
                    <Trash2 size={15} /> Delete Company
                  </button>
                </div>
              )}

              <div className="company-summary-grid">
                {summary.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="company-summary-card">
                      <Icon size={18} color="var(--primary)" />
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  );
                })}
              </div>

              <div className="company-task-strip">
                <div><span>Processed</span><strong>{selected?.processedTaskCount || 0}</strong></div>
                <div><span>On Hold</span><strong>{selected?.onHoldTaskCount || 0}</strong></div>
                <div><span>Rejected</span><strong>{selected?.rejectedTaskCount || 0}</strong></div>
              </div>
            </div>

            <div className="card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>People</h3>
                <span className="task-comments-sub">{detailUsers.length} records</span>
              </div>
              {detailUsers.length ? (
                <div className="users-table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Phone</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailUsers.map((member) => (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>{member.email}</td>
                          <td>{member.role}</td>
                          <td>{member.department || '-'}</td>
                          <td>{member.phone || '-'}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                              <span className="badge" style={{ background: `${member.isActive ? 'var(--success)' : 'var(--text-muted)'}20`, color: member.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                                {member.isActive ? 'Active' : 'Disabled'}
                              </span>
                              {member.role !== 'SUPER_ADMIN' && member.id !== user?.id && (
                                <button
                                  type="button"
                                  className="toggle"
                                  aria-label={member.isActive ? `Disable ${member.name}` : `Enable ${member.name}`}
                                  onClick={() => updateUser.mutate(
                                    { id: member.id, data: { isActive: !member.isActive } },
                                    {
                                      onSuccess: () => setMessage({
                                        text: `${member.name} ${member.isActive ? 'disabled' : 'enabled'} successfully.`,
                                        kind: 'success',
                                      }),
                                      onError: (err) => setMessage({
                                        text: getApiErrorMessage(err, 'User status could not be updated.'),
                                        kind: 'error',
                                      }),
                                    }
                                  )}
                                >
                                  <div className="toggle-knob" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>No users found.</div>
              )}
            </div>

            <div className="card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Recent Tasks</h3>
                <span className="task-comments-sub">{detailTasks.length} shown</span>
              </div>
              <div className="company-task-list">
                {detailTasks.map((task) => (
                  <div key={task.id} className="company-task-item">
                    <div>
                      <div className="company-task-title">{task.title}</div>
                      <div className="company-task-meta">
                        {task.assignee?.name || 'Unassigned'} · {task.department || 'General'}
                      </div>
                    </div>
                    <div className="company-task-tags">
                      <span className="badge" style={{ background: `${STATUS_COLORS[task.status]}20`, color: STATUS_COLORS[task.status] }}>
                        {STATUS_LABELS[task.status] || task.status}
                      </span>
                      <span className="badge" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
                {!detailTasks.length && <div className="empty-state">No tasks found for this company.</div>}
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </>
  );
}
