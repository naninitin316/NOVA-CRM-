import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SupportDrawer } from '@/components/support/SupportDrawer';

export function DashboardLayout() {
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    const openSupport = () => setSupportOpen(true);
    window.addEventListener('crm-open-support', openSupport as EventListener);
    return () => window.removeEventListener('crm-open-support', openSupport as EventListener);
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>
      <SupportDrawer open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
}
