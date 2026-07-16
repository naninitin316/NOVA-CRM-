import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { isAxiosError } from 'axios';
import { Building2, Trash2, UserPlus } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { useUpdateProfile, useChangePassword, useUsers, useCreateUser, useDeleteUser, useUpdateUser } from '@/hooks/useApi';
import { useTheme } from '@/hooks/useTheme';
import { toggleNotification } from '@/store/settingsSlice';
import type { RootState } from '@/store';
import type { User, Role } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  CONTRIBUTOR: 'Contributor',
  VIEWER: 'Viewer',
  SUPPORT: 'Support',
  SALES_TEAM: 'Sales Team',
  HR_TEAM: 'HR Team',
};
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#f59e0b',
  ADMIN: '#8b5cf6',
  MEMBER: '#0ea5e9',
  CONTRIBUTOR: '#10b981',
  VIEWER: '#64748b',
  SUPPORT: '#ef4444',
  SALES_TEAM: '#0ea5e9',
  HR_TEAM: '#10b981',
};
const DEPARTMENT_OPTIONS = ['Sales', 'HR', 'IT', 'Administration', 'Finance', 'Engineering', 'Marketing', 'Support'] as const;
const MANAGED_ROLES: Role[] = ['ADMIN', 'MEMBER', 'CONTRIBUTOR', 'VIEWER', 'SUPPORT'];

export function SettingsPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const settings = useSelector((s: RootState) => s.settings);
  const dispatch = useDispatch();
  const { theme, setTheme } = useTheme();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const activeCompany = user?.company || '';

  const [tab, setTab] = useState<'profile' | 'system' | 'admin'>('profile');
  const [showUserModal, setShowUserModal] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; kind?: 'success' | 'error' } | null>(null);

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();

  const profileForm = useForm({ defaultValues: { name: user?.name || '', email: user?.email || '', phone: user?.phone || '' } });
  const passwordForm = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  const userForm = useForm({ defaultValues: { name: '', email: '', password: '', role: 'CONTRIBUTOR' as Role, department: '', phone: '' } });

  const tabs = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'system' as const, label: 'System' },
    ...(isAdmin ? [{ key: 'admin' as const, label: 'Admin' }] : []),
  ];

  useEffect(() => {
    profileForm.reset({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [profileForm, user?.email, user?.name, user?.phone]);

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

  return (
    <>
      <TopBar title="Settings" />
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-heading">Settings</h2>
            <p className="page-desc">Manage your profile, preferences, and account</p>
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
        <Toast open={!!toast} text={toast?.text || ''} kind={toast?.kind || 'success'} onClose={() => setToast(null)} />

        <div className="settings-tabs">
          {tabs.map((t) => (
            <button key={t.key} className={`settings-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="card settings-panel">
            <h3 className="settings-card-title">Profile Settings</h3>
            <div className="settings-profile-head">
              <div className="settings-profile-avatar">{user?.name?.charAt(0)}</div>
              <div>
                <div className="settings-profile-name">{user?.name}</div>
                <span className="badge" style={{ background: `${ROLE_COLORS[user?.role || 'CONTRIBUTOR']}20`, color: ROLE_COLORS[user?.role || 'CONTRIBUTOR'] }}>
                  {ROLE_LABELS[user?.role || 'CONTRIBUTOR']}
                </span>
              </div>
            </div>
            <form
              onSubmit={profileForm.handleSubmit((d) =>
                updateProfile.mutate({
                  name: d.name.trim(),
                  email: d.email.trim(),
                  phone: d.phone?.trim() || undefined,
                }, {
                  onSuccess: () => setToast({ text: 'Successfully done. Profile saved.', kind: 'success' }),
                  onError: (err) => {
                    const apiMessage = isAxiosError(err)
                      ? err.response?.data?.error || err.response?.data?.message || err.message
                      : 'Profile could not be saved.';
                    setToast({ text: apiMessage, kind: 'error' });
                  },
                })
              )}
            >
              {(['name', 'email', 'phone'] as const).map((field) => (
                <Controller key={field} control={profileForm.control} name={field}
                  render={({ field: f }) => (
                    <div className="form-group">
                      <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                      <input className="form-input" {...f} type={field === 'email' ? 'email' : 'text'} />
                    </div>
                  )}
                />
              ))}
              <button type="submit" className="btn btn-primary" disabled={updateProfile.isPending}>Save Profile</button>
            </form>
          </div>
        )}

        {tab === 'system' && (
          <div className="settings-stack">
            <div className="card">
              <h3 className="chart-card-title">Appearance</h3>
              <div className="theme-picker">
                {(['dark', 'light'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`theme-option ${theme === mode ? 'active' : ''}`}
                    onClick={() => setTheme(mode)}
                  >
                    <div className={`theme-preview theme-preview-${mode}`}>
                      <div className="theme-preview-bar" />
                    </div>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)} mode
                  </button>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 className="settings-card-title">Notifications</h3>
              {(['email', 'push', 'taskUpdates', 'weeklyReport'] as const).map((key) => (
                <div key={key} className="settings-list-row">
                  <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</span>
                  <div className={`toggle ${settings.notifications[key] ? 'on' : ''}`}
                    onClick={() => dispatch(toggleNotification(key))}>
                    <div className="toggle-knob" />
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="settings-card-title">Change Password</h3>
              <form onSubmit={passwordForm.handleSubmit((d) => {
                if (d.newPassword !== d.confirmPassword) {
                  setMessage({ text: 'Passwords do not match.', kind: 'error' });
                  return;
                }
                changePassword.mutate(
                  { currentPassword: d.currentPassword, newPassword: d.newPassword },
                  {
                    onSuccess: () => {
                      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setToast({ text: 'Successfully done. Password updated.', kind: 'success' });
                    },
                    onError: (err) => {
                      const apiMessage = isAxiosError(err)
                        ? err.response?.data?.error || err.response?.data?.message || err.message
                        : 'Password could not be updated.';
                      setMessage({ text: apiMessage, kind: 'error' });
                    },
                  }
                );
              })}>
                {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
                  <Controller key={field} control={passwordForm.control} name={field}
                    render={({ field: f }) => (
                      <div className="form-group">
                        <label className="form-label">{field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</label>
                        <input className="form-input" type="password" {...f} />
                      </div>
                    )}
                  />
                ))}
                <button type="submit" className="btn btn-primary">Update Password</button>
              </form>
            </div>
          </div>
        )}

        {tab === 'admin' && isAdmin && (
          <div className="settings-admin">
            <div className="settings-admin-head">
              <h3 className="settings-card-title">User Management</h3>
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
            </div>
            {(users || []).map((u: User) => (
              <div key={u.id} className="card settings-user-card">
                <div className="settings-user-row">
                  <div className="sidebar-avatar">{u.name.charAt(0)}</div>
                  <div className="settings-user-copy">
                    <div className="settings-user-name">{u.name}</div>
                    <div className="settings-user-email">{u.email}</div>
                  </div>
                  <span className="badge" style={{ background: `${ROLE_COLORS[u.role]}20`, color: ROLE_COLORS[u.role] }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  <span className="badge" style={{ background: `${u.isActive ? 'var(--success)' : 'var(--text-muted)'}20`, color: u.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                  {u.id !== user?.id && (
                    <button
                      type="button"
                      className="toggle"
                      aria-label={u.isActive ? `Disable ${u.name}` : `Enable ${u.name}`}
                      onClick={() => updateUser.mutate(
                        { id: u.id, data: { isActive: !u.isActive } },
                        {
                          onSuccess: () => setMessage({ text: `${u.name} has been ${u.isActive ? 'disabled' : 'enabled'}.`, kind: 'success' }),
                          onError: (err) => {
                            const apiMessage = isAxiosError(err)
                              ? err.response?.data?.error || err.response?.data?.message || err.message
                              : 'User could not be updated.';
                            setMessage({ text: apiMessage, kind: 'error' });
                          },
                        }
                      )}
                    >
                      <div className="toggle-knob" />
                    </button>
                  )}
                  {u.id !== user?.id && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => confirm(`Delete ${u.name}?`) && deleteUser.mutate(u.id, {
                        onSuccess: () => setToast({ text: `${u.name} deleted successfully.`, kind: 'success' }),
                        onError: (err) => {
                          const apiMessage = isAxiosError(err)
                            ? err.response?.data?.error || err.response?.data?.message || err.message
                            : 'User could not be deleted.';
                          setToast({ text: apiMessage, kind: 'error' });
                        },
                      })}
                    >
                      <Trash2 size={16} color="var(--error)" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="card settings-departments">
              <h3 className="settings-card-title">Departments</h3>
              {['Management', 'Sales', 'HR', 'IT', 'Administration', 'Finance', 'Engineering', 'Marketing', 'Support'].map((dept) => (
                <div key={dept} className="settings-list-row">
                  <Building2 size={18} color="var(--text-secondary)" />
                  <span className="settings-list-label">{dept}</span>
                  <span className="settings-list-meta">
                    {(users || []).filter((u: User) => u.department === dept).length} members
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Modal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Add New User"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)}>Cancel</button>
            <button type="submit" form="user-form" className="btn btn-primary" disabled={!activeCompany}>Create</button>
          </>
        }
      >
        <form
          id="user-form"
          onSubmit={userForm.handleSubmit((d) =>
              createUser.mutate(
                {
                  name: d.name,
                  email: d.email,
                  password: d.password,
                  role: d.role,
                  company: activeCompany,
                  department: d.department || undefined,
                  phone: d.phone,
                },
              {
                onSuccess: () => {
                  setUserModalError(null);
                  setMessage({ text: 'User created successfully.', kind: 'success' });
                  setShowUserModal(false);
                  userForm.reset();
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
            )
          )}
        >
          <div className="company-page-badge company-page-badge--modal">
            <span>Company</span>
            <strong>{activeCompany || 'Company required'}</strong>
          </div>
          {userModalError && <p className="form-error" style={{ marginBottom: 12 }}>{userModalError}</p>}
          {(['name', 'email', 'password'] as const).map((field) => (
            <Controller key={field} control={userForm.control} name={field}
              render={({ field: f }) => (
                <div className="form-group">
                  <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                  <input className="form-input" type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} {...f} />
                  {userForm.formState.errors[field]?.message && (
                    <p className="form-error">{userForm.formState.errors[field]?.message as string}</p>
                  )}
                </div>
              )}
            />
          ))}
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
              <Controller control={userForm.control} name="role"
                render={({ field }) => (
                  <>
                    {(
                      user?.role === 'SUPER_ADMIN'
                        ? ['ADMIN', ...MANAGED_ROLES.filter((role) => role !== 'ADMIN')]
                        : MANAGED_ROLES.filter((role) => role !== 'ADMIN' && role !== 'SUPPORT')
                    ).map((r) => (
                      <button key={r} type="button" className={`chip ${field.value === r ? 'active' : ''}`}
                        onClick={() => field.onChange(r)}>{ROLE_LABELS[r]}</button>
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
