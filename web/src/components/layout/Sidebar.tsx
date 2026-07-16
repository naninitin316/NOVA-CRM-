import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, BarChart3, Users, Building2, FileSpreadsheet, Settings, Diamond, LogOut, LifeBuoy, MousePointerClick } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useCompany, useLogout } from '@/hooks/useApi';
import type { RootState } from '@/store';
import { getBrandLabel } from '@/utils/brand';

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

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  superAdminOnly?: boolean;
  contributorOnly?: boolean;
  supportOnly?: boolean;
  onlineLeadsOnly?: boolean;
};

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/progress', icon: BarChart3, label: 'Progress' },
  { to: '/online-leads', icon: MousePointerClick, label: 'Online Leads', onlineLeadsOnly: true },
  { to: '/companies', icon: Building2, label: 'Companies', superAdminOnly: true },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/reports', icon: FileSpreadsheet, label: 'Reports', contributorOnly: true },
  { to: '/support', icon: LifeBuoy, label: 'Support', supportOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const user = useSelector((s: RootState) => s.auth.user);
  const logout = useLogout();
  const showUsers = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MEMBER';
  const showReports = user?.role === 'CONTRIBUTOR' || user?.role === 'SALES_TEAM' || user?.role === 'HR_TEAM' || user?.role === 'VIEWER';
  const showSupport = user?.role === 'SUPPORT' || user?.role === 'SUPER_ADMIN';
  const showOnlineLeads = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MEMBER';
  const isViewer = user?.role === 'VIEWER';
  const brandLabel = getBrandLabel(user);
  const companyName = user?.role === 'SUPER_ADMIN' ? undefined : user?.company;
  const { data: companyDetail } = useCompany(companyName);
  const companyLogo = companyDetail?.logo;
  const showBrandIcon = user?.role !== 'SUPER_ADMIN' || Boolean(companyLogo);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {showBrandIcon && (
          <div className={`sidebar-logo-icon ${companyLogo ? 'has-company-logo' : ''}`}>
            {companyLogo ? (
              <img className="sidebar-company-logo" src={companyLogo} alt={`${brandLabel} logo`} />
            ) : (
              <Diamond size={22} />
            )}
          </div>
        )}
        <span className="sidebar-logo-text">{brandLabel}</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.filter((item) =>
          (!isViewer || (item.to !== '/tasks' && item.to !== '/progress')) &&
          (showUsers || item.to !== '/users')
          && (!item.superAdminOnly || user?.role === 'SUPER_ADMIN')
          && (!item.contributorOnly || showReports)
          && (!item.supportOnly || showSupport)
          && (!item.onlineLeadsOnly || showOnlineLeads)
        ).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user.name.charAt(0)}</div>
            <div>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{ROLE_LABELS[user.role]}</div>
            </div>
          </div>
        )}
        <button className="sidebar-logout" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
