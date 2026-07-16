import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, Settings, UserCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useLogout } from '@/hooks/useApi';
import { useSupportUnread } from '@/hooks/useSupportUnread';
import { ReminderBell } from './ReminderBell';
import type { RootState } from '@/store';

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

interface TopBarProps {
  title: string;
  onSearch?: (q: string) => void;
  searchValue?: string;
  onSupportClick?: () => void;
}

export function TopBar({ title, onSearch, searchValue, onSupportClick }: TopBarProps) {
  const user = useSelector((s: RootState) => s.auth.user);
  const navigate = useNavigate();
  const logout = useLogout();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useSupportUnread(Boolean(user));

  useEffect(() => {
    if (!accountOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [accountOpen]);

  const openSettings = () => {
    setAccountOpen(false);
    navigate('/settings');
  };

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        {onSearch && (
          <div className="topbar-search">
            <Search size={16} color="var(--text-muted)" />
            <input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}
        <ThemeToggle />
        <ReminderBell />
        <button
          type="button"
          className={`topbar-support-btn ${unreadCount ? 'has-unread' : ''}`}
          aria-label={unreadCount ? `Support, ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}` : 'Support'}
          title={unreadCount ? `${unreadCount} unread support message${unreadCount === 1 ? '' : 's'}` : 'Open support'}
          onClick={() => {
            if (onSupportClick) {
              onSupportClick();
              return;
            }
            window.dispatchEvent(new CustomEvent('crm-open-support'));
          }}
        >
          Support
          {unreadCount > 0 && (
            <span className="topbar-support-badge" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {user && (
          <div className="topbar-account" ref={accountRef}>
            <button
              type="button"
              className={`topbar-profile ${accountOpen ? 'open' : ''}`}
              onClick={() => setAccountOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
            >
              <div>
                <div className="topbar-profile-name">{user.name}</div>
                <span
                  className="role-badge"
                  style={{
                    background: `${ROLE_COLORS[user.role]}18`,
                    color: ROLE_COLORS[user.role],
                  }}
                >
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <div className="topbar-avatar">{user.name.charAt(0)}</div>
            </button>

            {accountOpen && (
              <div className="topbar-account-menu" role="menu">
                <div className="topbar-account-title">My Account</div>
                <button type="button" className="topbar-account-item" role="menuitem" onClick={openSettings}>
                  <UserCircle size={18} />
                  Profile
                </button>
                <button type="button" className="topbar-account-item" role="menuitem" onClick={openSettings}>
                  <Settings size={18} />
                  Settings
                </button>
                <button type="button" className="topbar-account-item topbar-account-signout" role="menuitem" onClick={logout}>
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
