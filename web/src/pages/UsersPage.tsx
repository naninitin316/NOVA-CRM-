import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Controller, useForm } from 'react-hook-form';
import { isAxiosError } from 'axios';
import { Building2, ChevronRight, Pencil, Search, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Modal } from '@/components/ui/Modal';
import { useCompanies, useCompany, useCreateCompany, useCreateUser, useDeleteUser, useUpdateUser } from '@/hooks/useApi';
import type { RootState } from '@/store';
import type { Role, User } from '@/types';
import { readLogoFile } from '@/utils/image';

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  CONTRIBUTOR: 'Contributor',
  VIEWER: 'Viewer',
  SUPPORT: 'Support',
  SALES_TEAM: 'Sales Team',
  HR_TEAM: 'HR Team',
};

const ROLE_BADGES: Record<Role, string> = {
  SUPER_ADMIN: '#f59e0b',
  ADMIN: '#8b5cf6',
  MEMBER: '#0ea5e9',
  CONTRIBUTOR: '#10b981',
  VIEWER: '#64748b',
  SUPPORT: '#ef4444',
  SALES_TEAM: '#0ea5e9',
  HR_TEAM: '#10b981',
};
const STATUS_COLORS = {
  active: 'var(--success)',
  disabled: 'var(--text-muted)',
} as const;
const DEPARTMENT_OPTIONS = ['Sales', 'HR', 'IT', 'Administration', 'Finance', 'Engineering', 'Marketing', 'Support'] as const;

type CompanyForm = { name: string; director: string; gstNo: string; phone: string; logo: string };
type UserForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
  department: string;
  phone: string;
};
type EditUserForm = Omit<UserForm, 'password'>;

export function UsersPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const isMember = user?.role === 'MEMBER';
  const canCreateCompany = isSuperAdmin;
  const canCreateUser = isSuperAdmin || isAdmin || isMember;
  const canManageStatus = isSuperAdmin || isAdmin;
  const canEditUsers = isSuperAdmin || isAdmin;
  const canDeleteUsers = isSuperAdmin || isAdmin;

  const { data: companies } = useCompanies();
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const { data: companyDetail, isLoading } = useCompany(selectedCompany);

  const createCompany = useCreateCompany();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [editUserModalError, setEditUserModalError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const companyForm = useForm<CompanyForm>({ defaultValues: { name: '', director: '', gstNo: '', phone: '', logo: '' } });
  const userForm = useForm<UserForm>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'CONTRIBUTOR',
      department: '',
      phone: '',
    },
  });
  const editUserForm = useForm<EditUserForm>({
    defaultValues: {
      name: '',
      email: '',
      role: 'CONTRIBUTOR',
      department: '',
      phone: '',
    },
  });

  const availableRoles: Role[] = useMemo(() => {
    if (isSuperAdmin) return ['ADMIN', 'MEMBER', 'CONTRIBUTOR', 'VIEWER', 'SUPPORT'];
    if (isAdmin) return ['ADMIN', 'MEMBER', 'CONTRIBUTOR', 'VIEWER'];
    if (isMember) return ['CONTRIBUTOR'];
    return [];
  }, [isAdmin, isMember, isSuperAdmin]);

  useEffect(() => {
    if (!selectedCompany && companies?.length) setSelectedCompany(companies[0].name);
  }, [companies, selectedCompany]);

  useEffect(() => {
    if (!isSuperAdmin && user?.company) {
      setSelectedCompany(user.company);
    }
  }, [isSuperAdmin, user?.company]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!showUserModal) {
      setUserModalError(null);
      userForm.clearErrors();
    }
  }, [showUserModal, userForm]);

  useEffect(() => {
    if (!editingUser) {
      setEditUserModalError(null);
      editUserForm.clearErrors();
    }
  }, [editingUser, editUserForm]);

  const selectedCompanyCard = companyDetail || companies?.find((item) => item.name === selectedCompany);
  const members = companyDetail?.users || [];
  const filteredMembers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => [
      member.name,
      member.email,
      ROLE_LABELS[member.role],
      member.role,
      member.department,
      member.phone,
      member.company,
    ].some((value) => value?.toLowerCase().includes(query)));
  }, [members, userSearch]);
  const contributorMembers = useMemo(
    () => filteredMembers.filter((member) => member.role === 'CONTRIBUTOR'),
    [filteredMembers]
  );
  const memberCount = selectedCompanyCard?.userCount ?? members.length;
  const activeMemberCount = selectedCompanyCard?.activeUserCount ?? members.filter((member) => member.isActive).length;
  const contributorCount = selectedCompanyCard?.contributorCount ?? members.filter((member) => member.role === 'CONTRIBUTOR').length;
  const visiblePeople = isMember ? contributorMembers : filteredMembers;

  const groupedByRole = useMemo(() => {
    const groups: Record<string, User[]> = {};
    filteredMembers.forEach((member) => {
      if (!groups[member.role]) groups[member.role] = [];
      groups[member.role].push(member);
    });
    return groups;
  }, [filteredMembers]);
  const activeCompany = isSuperAdmin ? selectedCompany : user?.company || '';

  const getApiErrorMessage = (err: unknown, fallback: string) => (
    isAxiosError(err)
      ? err.response?.data?.error || err.response?.data?.message || err.message
      : fallback
  );

  const handleDeleteUser = (member: User) => {
    if (member.id === user?.id) {
      setMessage({ text: 'You cannot delete your own account.', kind: 'error' });
      return;
    }
    if (member.role === 'SUPER_ADMIN') {
      setMessage({ text: 'Super admin accounts cannot be deleted here.', kind: 'error' });
      return;
    }
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return;

    deleteUser.mutate(member.id, {
      onSuccess: () => setMessage({ text: `${member.name} deleted successfully.`, kind: 'success' }),
      onError: (err) => setMessage({
        text: getApiErrorMessage(err, 'User could not be deleted.'),
        kind: 'error',
      }),
    });
  };

  const openEditUser = (member: User) => {
    setEditUserModalError(null);
    editUserForm.clearErrors();
    editUserForm.reset({
      name: member.name,
      email: member.email,
      role: member.role,
      department: member.department || '',
      phone: member.phone || '',
    });
    setEditingUser(member);
  };

  return (
    <>
      <TopBar title="Users" />
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-heading">Users</h2>
            <p className="page-desc">Companies, employees, contributors, and customer viewers.</p>
            <div className="company-page-badge">
              <span>Company</span>
              <strong>{activeCompany || 'Select a company'}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {canCreateCompany && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCompanyModal(true)}>
                <Building2 size={16} /> Add Company
              </button>
            )}
            {canCreateUser && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setUserModalError(null);
                  userForm.clearErrors();
                  setShowUserModal(true);
                }}
              >
                <UserPlus size={16} /> Add User
              </button>
            )}
          </div>
        </div>

        {message && (
          <div
            className="card"
            style={{
              marginBottom: 16,
              borderColor: message.kind === 'success' ? 'var(--success)' : 'var(--error)',
              color: message.kind === 'success' ? 'var(--success)' : 'var(--error)',
            }}
          >
            {message.text}
          </div>
        )}

        <div className="users-layout">
          <div className="users-company-list">
            {isSuperAdmin ? (
              <>
                <div className="section-header" style={{ marginBottom: 12 }}>
                  <h3 className="section-title" style={{ marginBottom: 0 }}>Companies</h3>
                  <span className="task-comments-sub">{companies?.length || 0} registered</span>
                </div>
                <div className="companies-grid">
                  {(companies || []).map((company) => {
                    const active = selectedCompany === company.name;
                    return (
                      <button
                        key={company.id}
                        className={`company-card ${active ? 'active' : ''}`}
                        onClick={() => setSelectedCompany(company.name)}
                      >
                        <div className="company-card-head">
                          <div>
                            <div className="company-name">{company.name}</div>
                            <div className="company-sub">{company.userCount || 0} users · {company.activeUserCount || 0} active</div>
                          </div>
                          <ChevronRight size={16} />
                        </div>
                        <div className="company-metrics">
                          <span><strong>{company.adminCount || 0}</strong> admins</span>
                          <span><strong>{company.memberCount || 0}</strong> members</span>
                          <span><strong>{company.contributorCount || 0}</strong> contributors</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="section-header" style={{ marginBottom: 0 }}>
                  <div>
                    <h3 className="section-title" style={{ marginBottom: 0 }}>
                      {selectedCompanyCard ? selectedCompanyCard.name : 'My Company'}
                    </h3>
                    <span className="task-comments-sub">{memberCount} users total</span>
                  </div>
                  <UsersIcon size={18} color="var(--primary)" />
                </div>
              </div>
            )}
          </div>

          <div className="users-company-detail">
            <div className="card">
              <div className="section-header">
                <div>
                  <h3 className="section-title" style={{ marginBottom: 0 }}>
                    {selectedCompanyCard ? selectedCompanyCard.name : 'Select a company'}
                  </h3>
                  <span className="task-comments-sub">
                    {isLoading ? 'Loading...' : `${memberCount} team members`}
                  </span>
                </div>
                <UsersIcon size={18} color="var(--primary)" />
              </div>

              <div className="users-summary">
                <div>
                  <span>{isMember ? 'Contributors' : 'Admins'}</span>
                  <strong>{isMember ? contributorCount : selectedCompanyCard?.adminCount || 0}</strong>
                </div>
                <div>
                  <span>{isMember ? 'Company' : 'Members'}</span>
                  <strong>{isMember ? (selectedCompanyCard?.name || user?.company || '-') : selectedCompanyCard?.memberCount || 0}</strong>
                </div>
                <div>
                  <span>{isMember ? 'Total' : 'Contributors'}</span>
                  <strong>{isMember ? memberCount : selectedCompanyCard?.contributorCount || 0}</strong>
                </div>
                <div>
                  <span>Active</span>
                  <strong>{activeMemberCount}</strong>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <h3 className="section-title" style={{ marginBottom: 0 }}>
                    {isMember ? 'Contributors' : 'People'}
                  </h3>
                  <span className="task-comments-sub">
                    {userSearch.trim()
                      ? `${visiblePeople.length} matching ${visiblePeople.length === 1 ? 'record' : 'records'}`
                      : isMember ? `${contributorMembers.length} contributors` : `${members.length} records`}
                  </span>
                </div>
                <div className="users-search">
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search users..."
                    aria-label="Search users"
                  />
                </div>
              </div>

              {visiblePeople.length ? (
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
                        {(canEditUsers || canDeleteUsers) && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePeople.map((member) => (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>{member.email}</td>
                          <td>
                            <span className="badge" style={{ background: `${ROLE_BADGES[member.role]}20`, color: ROLE_BADGES[member.role] }}>
                              {ROLE_LABELS[member.role]}
                            </span>
                          </td>
                          <td>{member.department || '-'}</td>
                          <td>{member.phone || '-'}</td>
                          <td>
                            <div className="users-status-actions">
                              <span className="badge" style={{ background: `${member.isActive ? STATUS_COLORS.active : STATUS_COLORS.disabled}20`, color: member.isActive ? STATUS_COLORS.active : STATUS_COLORS.disabled }}>
                                {member.isActive ? 'Active' : 'Disabled'}
                              </span>
                              {canManageStatus && member.id !== user?.id && member.role !== 'SUPER_ADMIN' && (
                                <button
                                  type="button"
                                  className={`toggle ${member.isActive ? 'on' : ''}`}
                                  aria-label={member.isActive ? `Disable ${member.name}` : `Enable ${member.name}`}
                                  onClick={() => updateUser.mutate({
                                    id: member.id,
                                    data: { isActive: !member.isActive },
                                  }, {
                                    onSuccess: () => setMessage({
                                      text: `${member.name} has been ${member.isActive ? 'disabled' : 'enabled'}.`,
                                      kind: 'success',
                                    }),
                                  })}
                                >
                                  <div className="toggle-knob" />
                                </button>
                              )}
                            </div>
                          </td>
                          {(canEditUsers || canDeleteUsers) && (
                            <td>
                              <div className="users-row-actions">
                                {member.id !== user?.id && member.role !== 'SUPER_ADMIN' ? (
                                  <>
                                    {canEditUsers && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        aria-label={`Edit ${member.name}`}
                                        disabled={updateUser.isPending}
                                        onClick={() => openEditUser(member)}
                                      >
                                        <Pencil size={16} />
                                      </button>
                                    )}
                                    {canDeleteUsers && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm btn-icon-danger"
                                        aria-label={`Delete ${member.name}`}
                                        disabled={deleteUser.isPending}
                                        onClick={() => handleDeleteUser(member)}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span className="task-comments-sub">-</span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  {userSearch.trim() ? 'No users matched your search.' : 'No members found for this company.'}
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>
                  {isMember ? 'Contributor Cards' : 'Role Groups'}
                </h3>
                <span className="task-comments-sub">
                  {isMember ? 'Contributors in your company' : 'Grouped by access level'}
                </span>
              </div>
              <div className="role-groups">
                {Object.entries(isMember ? { CONTRIBUTOR: contributorMembers } : groupedByRole).map(([role, people]) => (
                  <div key={role} className="role-group">
                    <div className="role-group-title">
                      <span className="badge" style={{ background: `${ROLE_BADGES[role as Role]}20`, color: ROLE_BADGES[role as Role] }}>
                        {ROLE_LABELS[role as Role]}
                      </span>
                      <strong>{people.length}</strong>
                    </div>
                    <div className="role-group-list">
                      {people.map((member) => (
                        <div key={member.id} className="role-group-item">
                          <span>{member.name}</span>
                          <span>{member.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title="Add Company"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowCompanyModal(false)}>Cancel</button>
            <button type="submit" form="company-form" className="btn btn-primary">Create Company</button>
          </>
        }
      >
        <form
          id="company-form"
          onSubmit={companyForm.handleSubmit((data) =>
            createCompany.mutate(
              { name: data.name, director: data.director, gstNo: data.gstNo, phone: data.phone, logo: data.logo || undefined },
              {
                onSuccess: (_res, variables) => {
                  setMessage({ text: `Company ${variables.name} created successfully.`, kind: 'success' });
                  setShowCompanyModal(false);
                  companyForm.reset({ name: '', director: '', gstNo: '', phone: '', logo: '' });
                },
                onError: (err) => {
                  const apiMessage = isAxiosError(err)
                    ? err.response?.data?.error || err.response?.data?.message || err.message
                    : 'Company could not be created.';
                  setMessage({ text: apiMessage, kind: 'error' });
                },
              }
            )
          )}
        >
          <Controller
            control={companyForm.control}
            name="name"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Company name</label>
                <input className="form-input" {...field} placeholder="Nova Homes" />
              </div>
            )}
          />
          <Controller
            control={companyForm.control}
            name="director"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Director</label>
                <input className="form-input" {...field} placeholder="Director name" />
              </div>
            )}
          />
          <Controller
            control={companyForm.control}
            name="gstNo"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">GST No</label>
                <input className="form-input" {...field} placeholder="27ABCDE1234F1Z5" />
              </div>
            )}
          />
          <Controller
            control={companyForm.control}
            name="phone"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" {...field} placeholder="+91 98765 43210" />
              </div>
            )}
          />
          <Controller
            control={companyForm.control}
            name="logo"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Company logo</label>
                <div className="company-logo-upload">
                  <div className="company-logo-preview">
                    {field.value ? <img src={field.value} alt="Company logo preview" /> : <Building2 size={20} />}
                  </div>
                  <div>
                    <input
                      className="form-input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        readLogoFile(event.target.files?.[0])
                          .then(field.onChange)
                          .catch((error) => setMessage({ text: error instanceof Error ? error.message : 'Logo could not be uploaded.', kind: 'error' }));
                      }}
                    />
                    <span className="task-comments-sub">PNG, JPG, or WEBP. Max 600 KB.</span>
                  </div>
                </div>
              </div>
            )}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)} disabled={updateUser.isPending}>
              Cancel
            </button>
            <button type="submit" form="edit-user-form" className="btn btn-primary" disabled={!editingUser || updateUser.isPending}>
              {updateUser.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form
          id="edit-user-form"
          onSubmit={editUserForm.handleSubmit((data) => {
            if (!editingUser || updateUser.isPending) return;
            updateUser.mutate(
              {
                id: editingUser.id,
                data: {
                  name: data.name,
                  email: data.email,
                  role: data.role,
                  department: data.department || undefined,
                  phone: data.phone,
                },
              },
              {
                onSuccess: () => {
                  setEditUserModalError(null);
                  setMessage({ text: `${data.name} updated successfully.`, kind: 'success' });
                  setEditingUser(null);
                },
                onError: (err) => {
                  const apiMessage = getApiErrorMessage(err, 'User could not be updated.');
                  const normalized = apiMessage.toLowerCase();
                  setEditUserModalError(null);
                  editUserForm.clearErrors();
                  if (normalized.includes('email')) {
                    editUserForm.setError('email', { type: 'server', message: apiMessage });
                  } else if (normalized.includes('role') || normalized.includes('permission')) {
                    editUserForm.setError('role', { type: 'server', message: apiMessage });
                  } else if (normalized.includes('department')) {
                    editUserForm.setError('department', { type: 'server', message: apiMessage });
                  } else {
                    setEditUserModalError(apiMessage);
                  }
                  setMessage({ text: apiMessage, kind: 'error' });
                },
              }
            );
          })}
        >
          {editUserModalError && <p className="form-error" style={{ marginBottom: 12 }}>{editUserModalError}</p>}
          <Controller
            control={editUserForm.control}
            name="name"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" {...field} />
                {editUserForm.formState.errors.name?.message && (
                  <p className="form-error">{editUserForm.formState.errors.name.message}</p>
                )}
              </div>
            )}
          />
          <Controller
            control={editUserForm.control}
            name="email"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" {...field} />
                {editUserForm.formState.errors.email?.message && (
                  <p className="form-error">{editUserForm.formState.errors.email.message}</p>
                )}
              </div>
            )}
          />
          <Controller
            control={editUserForm.control}
            name="phone"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" {...field} />
                {editUserForm.formState.errors.phone?.message && (
                  <p className="form-error">{editUserForm.formState.errors.phone.message}</p>
                )}
              </div>
            )}
          />
          <div className="form-group">
            <label className="form-label">Department</label>
            <Controller
              control={editUserForm.control}
              name="department"
              render={({ field }) => (
                <div className="chip-row">
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <button
                      key={department}
                      type="button"
                      className={`chip ${field.value === department ? 'active' : ''}`}
                      onClick={() => field.onChange(field.value === department ? '' : department)}
                    >
                      {department}
                    </button>
                  ))}
                </div>
              )}
            />
            {editUserForm.formState.errors.department?.message && (
              <p className="form-error">{editUserForm.formState.errors.department.message}</p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <div className="chip-row">
              <Controller
                control={editUserForm.control}
                name="role"
                render={({ field }) => (
                  <>
                    {availableRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={`chip ${field.value === role ? 'active' : ''}`}
                        onClick={() => field.onChange(role)}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </>
                )}
              />
            </div>
            {editUserForm.formState.errors.role?.message && (
              <p className="form-error">{editUserForm.formState.errors.role.message}</p>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Add User"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)} disabled={createUser.isPending}>
              Cancel
            </button>
            <button type="submit" form="user-form" className="btn btn-primary" disabled={!activeCompany || createUser.isPending}>
              {createUser.isPending ? 'Creating...' : 'Create User'}
            </button>
          </>
        }
      >
        <form
          id="user-form"
          onSubmit={userForm.handleSubmit((data) => {
            if (createUser.isPending) return;
            createUser.mutate(
              {
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role,
                company: activeCompany,
                department: data.department || undefined,
                phone: data.phone,
              },
              {
                onSuccess: (response) => {
                  const welcomeEmail = (response.data.data as User & {
                    welcomeEmail?: { sent?: boolean; skipped?: boolean; error?: string };
                  } | undefined)?.welcomeEmail;
                  setUserModalError(null);
                  setMessage({
                    text: welcomeEmail && !welcomeEmail.sent
                      ? `User created, mail not sent: ${welcomeEmail.error || 'SMTP did not send the message.'}`
                      : 'User created successfully. Welcome email sent.',
                    kind: 'success',
                  });
                  setShowUserModal(false);
                  userForm.reset({
                    name: '',
                    email: '',
                    password: '',
                    role: 'CONTRIBUTOR',
                    department: '',
                    phone: '',
                  });
                },
                onError: (err) => {
                  const apiMessage = isAxiosError(err)
                    ? err.response?.data?.error || err.response?.data?.message || err.message
                    : 'User could not be created.';
                  const normalized = apiMessage.toLowerCase();
                  setUserModalError(null);
                  userForm.clearErrors();
                  if (normalized.includes('email')) {
                    userForm.setError('email', { type: 'server', message: apiMessage });
                  } else if (normalized.includes('password')) {
                    userForm.setError('password', { type: 'server', message: apiMessage });
                  } else if (normalized.includes('role') || normalized.includes('permission')) {
                    userForm.setError('role', { type: 'server', message: apiMessage });
                  } else if (normalized.includes('department')) {
                    userForm.setError('department', { type: 'server', message: apiMessage });
                  } else if (normalized.includes('company')) {
                    setUserModalError(apiMessage);
                  } else {
                    setUserModalError(apiMessage);
                  }
                  setMessage({ text: apiMessage, kind: 'error' });
                },
              }
            );
          })}
        >
          <div className="company-page-badge company-page-badge--modal">
            <span>Company</span>
            <strong>{activeCompany || 'Select a company'}</strong>
          </div>
          {userModalError && <p className="form-error" style={{ marginBottom: 12 }}>{userModalError}</p>}
          <Controller
            control={userForm.control}
            name="name"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" {...field} />
                {userForm.formState.errors.name?.message && (
                  <p className="form-error">{userForm.formState.errors.name.message}</p>
                )}
              </div>
            )}
          />
          <Controller
            control={userForm.control}
            name="email"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" {...field} />
                {userForm.formState.errors.email?.message && (
                  <p className="form-error">{userForm.formState.errors.email.message}</p>
                )}
              </div>
            )}
          />
          <Controller
            control={userForm.control}
            name="password"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" {...field} />
                {userForm.formState.errors.password?.message && (
                  <p className="form-error">{userForm.formState.errors.password.message}</p>
                )}
              </div>
            )}
          />
          <Controller
            control={userForm.control}
            name="phone"
            render={({ field }) => (
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" {...field} />
                {userForm.formState.errors.phone?.message && (
                  <p className="form-error">{userForm.formState.errors.phone.message}</p>
                )}
              </div>
            )}
          />
          <div className="form-group">
            <label className="form-label">Department</label>
            <Controller
              control={userForm.control}
              name="department"
              render={({ field }) => (
                <div className="chip-row">
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <button
                      key={department}
                      type="button"
                      className={`chip ${field.value === department ? 'active' : ''}`}
                      onClick={() => field.onChange(field.value === department ? '' : department)}
                    >
                      {department}
                    </button>
                  ))}
                </div>
              )}
            />
            {userForm.formState.errors.department?.message && (
              <p className="form-error">{userForm.formState.errors.department.message}</p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <div className="chip-row">
              <Controller
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <>
                    {availableRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={`chip ${field.value === role ? 'active' : ''}`}
                        onClick={() => field.onChange(role)}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </>
                )}
              />
            </div>
            {userForm.formState.errors.role?.message && (
              <p className="form-error">{userForm.formState.errors.role.message}</p>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
