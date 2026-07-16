import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { DashboardLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TasksPage } from '@/pages/TasksPage';
import { TaskDetailPage } from '@/pages/TaskDetailPage';
import { TaskEditPage } from '@/pages/TaskEditPage';
import { TaskCreatePage } from '@/pages/TaskCreatePage';
import { TaskImportPage } from '@/pages/TaskImportPage';
import { ProgressPage } from '@/pages/ProgressPage';
import { CompaniesPage } from '@/pages/CompaniesPage';
import { UsersPage } from '@/pages/UsersPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SupportPage } from '@/pages/SupportPage';
import { OnlineLeadsPage } from '@/pages/OnlineLeadsPage';
import { LeadCapturePage } from '@/pages/LeadCapturePage';
import { authApi } from '@/api';
import { tokenStorage } from '@/api/client';
import { setCredentials, setLoading } from '@/store/authSlice';
import { ThemeProvider } from '@/components/ThemeProvider';
import type { RootState } from '@/store';
import { getBrandLabel } from '@/utils/brand';

function BrandTitleSync() {
  const location = useLocation();
  const user = useSelector((s: RootState) => s.auth.user);

  useEffect(() => {
    const brand = getBrandLabel(user);
    const path = location.pathname.split('/')[1] || 'dashboard';
    const pageMap: Record<string, string> = {
      dashboard: 'Dashboard',
      tasks: 'Tasks',
      progress: 'Progress',
      companies: 'Companies',
      users: 'Users',
      reports: 'Reports',
      support: 'Support',
      'online-leads': 'Online Leads',
      'lead-form': 'Lead Form',
      settings: 'Settings',
    };
    const pageTitle = pageMap[path] || 'Dashboard';
    document.title = `${brand} - ${pageTitle}`;
  }, [location.pathname, user]);

  return null;
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const init = async () => {
      try {
        const token = tokenStorage.get();
        if (token) {
          const { data } = await authApi.getProfile();
          if (data.data) {
            dispatch(setCredentials({ user: data.data, token }));
            return;
          }
        }
      } catch {
        tokenStorage.remove();
      }
      dispatch(setLoading(false));
    };
    init();
  }, [dispatch]);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthBootstrap>
          <BrandTitleSync />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lead-form" element={<LeadCapturePage />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/new" element={<TaskCreatePage />} />
            <Route path="tasks/import" element={<TaskImportPage />} />
            <Route path="tasks/:id/edit" element={<TaskEditPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="online-leads" element={<OnlineLeadsPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </AuthBootstrap>
      </ThemeProvider>
    </BrowserRouter>
  );
}
