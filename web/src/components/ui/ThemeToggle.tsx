import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className="theme-toggle-track">
        <span className={`theme-toggle-icon ${theme === 'dark' ? 'active' : ''}`}>
          <Moon size={14} />
        </span>
        <span className={`theme-toggle-icon ${theme === 'light' ? 'active' : ''}`}>
          <Sun size={14} />
        </span>
      </span>
      {showLabel && (
        <span className="theme-toggle-label">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}
