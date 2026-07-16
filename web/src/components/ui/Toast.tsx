import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  open: boolean;
  text: string;
  kind?: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ open, text, kind = 'success', onClose }: ToastProps) {
  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="card"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 60,
        minWidth: 280,
        maxWidth: 420,
        padding: 16,
        borderColor: kind === 'success' ? 'var(--success)' : 'var(--error)',
        color: kind === 'success' ? 'var(--success)' : 'var(--error)',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.22)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <CheckCircle2 size={18} />
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{text}</div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close notification">
        <X size={14} />
      </button>
    </div>,
    document.body
  );
}
