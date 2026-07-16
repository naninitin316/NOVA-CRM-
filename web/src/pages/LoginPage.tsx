import './login.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useLogin } from '@/hooks/useApi';
import type { LoginCredentials } from '@/types';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [rememberMe, setRememberMe] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>();

  const onSubmit = (data: LoginCredentials) => {
    login.mutate({ ...data, rememberMe }, {
      onSuccess: () => navigate('/dashboard'),
    });
  };

  const errorMsg = (login.error as { response?: { data?: { error?: string } } })?.response?.data?.error;

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-theme-btn">
        <ThemeToggle showLabel />
      </div>
      <div className="login-container">
        <div className="login-brand">
          <div className="login-brand-content">
            <div className="login-brand-topline">
              NOVA CRM
            </div>
            <h1>Focused CRM for growing teams.</h1>
            <p>Manage leads, tasks, and team progress from one clean workspace.</p>
            <div className="login-insight-card">
              <div>
                <span>Today</span>
                <strong>Pipeline overview</strong>
              </div>
              <div className="login-insight-bars" aria-hidden="true">
                <span style={{ height: '42%' }} />
                <span style={{ height: '68%' }} />
                <span style={{ height: '52%' }} />
                <span style={{ height: '82%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-mobile-brand">
            NOVA CRM
          </div>
          <div className="login-form-heading">
            <span className="login-kicker">Workspace login</span>
            <h2>Welcome back</h2>
            <p className="login-subtitle">Sign in to continue to your dashboard.</p>
          </div>

          {errorMsg && (
            <div className="login-error">
              <AlertCircle size={18} />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="form-input-wrap">
                <Mail size={18} className="form-input-icon" />
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@company.com"
                  {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })}
                />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-input-wrap">
                <Lock size={18} className="form-input-icon" />
                <input
                  className="form-input"
                  type="password"
                  placeholder="Enter your password"
                  {...register('password', { required: 'Password is required' })}
                />
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <a href="#" className="login-forgot">Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary btn-lg login-submit" disabled={login.isPending}>
              <span>{login.isPending ? 'Signing in...' : 'Sign in'}</span>
              {!login.isPending && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="login-secure-note">
            <ShieldCheck size={16} />
            <span>Secure access for your company workspace</span>
          </div>
        </div>
      </div>
    </div>
  );
}
