import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { isAxiosError } from 'axios';
import { ArrowRight, Clock3, MessageSquare, Send, X } from 'lucide-react';
import { useCreateSupportTicket, useReplySupportTicket, useSupportTicket, useSupportTickets } from '@/hooks/useApi';
import { useSupportUnread } from '@/hooks/useSupportUnread';
import { Toast } from '@/components/ui/Toast';
import type { RootState } from '@/store';
import type { SupportStatus, SupportTicketDetail, SupportTicketSummary } from '@/types';

const STATUS_META: Record<SupportStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: 'var(--secondary)', bg: 'rgba(14,165,233,0.12)' },
  IN_PROGRESS: { label: 'In progress', color: 'var(--warning)', bg: 'rgba(245,158,11,0.14)' },
  RESOLVED: { label: 'Resolved', color: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
  CLOSED: { label: 'Closed', color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.14)' },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SupportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useSelector((s: RootState) => s.auth.user);
  const { data: tickets = [] } = useSupportTickets(undefined, open);
  const { isUnread, markTicketRead } = useSupportUnread(open);
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>();
  const { data: ticketDetail } = useSupportTicket(selectedTicketId);
  const createTicket = useCreateSupportTicket();
  const replyTicket = useReplySupportTicket();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [composeError, setComposeError] = useState('');
  const [toast, setToast] = useState<{ text: string; kind?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!selectedTicketId && tickets.length) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [open, tickets, selectedTicketId]);

  useEffect(() => {
    if (!open) {
      setSelectedTicketId(undefined);
      setSubject('');
      setMessage('');
      setReply('');
      setComposeError('');
      setToast(null);
    }
  }, [open]);

  const currentTicket = (ticketDetail || tickets.find((ticket) => ticket.id === selectedTicketId)) as SupportTicketDetail | SupportTicketSummary | undefined;
  const recentTickets = useMemo(() => tickets.slice(0, 8), [tickets]);
  const counts = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    progress: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
  }), [tickets]);

  useEffect(() => {
    if (open && currentTicket) {
      markTicketRead(currentTicket);
    }
  }, [currentTicket, markTicketRead, open]);

  const submitTicket = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanSubject || !cleanMessage) {
      setComposeError('Subject and message are required.');
      return;
    }
    setComposeError('');

    createTicket.mutate(
      { subject: cleanSubject, message: cleanMessage },
      {
        onSuccess: (response) => {
          const ticket = response?.data?.data;
          if (ticket?.id) setSelectedTicketId(ticket.id);
          setSubject('');
          setMessage('');
          setToast({ text: 'Successfully done. Support request sent.', kind: 'success' });
        },
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Support request could not be sent.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  const sendReply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanReply = reply.trim();
    if (!selectedTicketId || !cleanReply) return;

    replyTicket.mutate(
      { id: selectedTicketId, data: { message: cleanReply } },
      {
        onSuccess: () => {
          setReply('');
          setToast({ text: 'Successfully done. Message sent.', kind: 'success' });
        },
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Message could not be sent.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  if (!open) return null;

  return (
    <div className="support-drawer-overlay" onClick={onClose}>
      <aside className="support-drawer" onClick={(e) => e.stopPropagation()}>
        <Toast open={!!toast} text={toast?.text || ''} kind={toast?.kind || 'success'} onClose={() => setToast(null)} />
        <div className="support-drawer-header">
          <div>
            <p className="task-edit-eyebrow">Support</p>
            <h3 className="support-drawer-title">Need a hand?</h3>
            <p className="support-drawer-subtitle">Ask a question, track it live, and keep the thread in one place.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} /> Close
          </button>
        </div>

        <div className="support-drawer-stats">
          {[
            { label: 'Total', value: counts.total },
            { label: 'Open', value: counts.open },
            { label: 'Working', value: counts.progress },
            { label: 'Resolved', value: counts.resolved },
          ].map((item) => (
            <div key={item.label} className="support-drawer-stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="support-drawer-grid">
          <section className="support-drawer-panel">
            <div className="support-panel-head">
              <div>
                <p className="task-edit-eyebrow">New query</p>
                <h4>Message support</h4>
              </div>
              <MessageSquare size={18} color="var(--primary)" />
            </div>

            <form className="support-compose" onSubmit={submitTicket}>
              <input
                className="form-input"
                placeholder="Subject"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (composeError) setComposeError('');
                }}
              />
              <textarea
                className="form-input"
                rows={5}
                placeholder="Tell us what you need help with"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (composeError) setComposeError('');
                }}
              />
              {composeError && <p className="form-error" style={{ marginTop: -2 }}>{composeError}</p>}
              <button className="btn btn-primary btn-sm" type="submit" disabled={!subject.trim() || !message.trim() || createTicket.isPending}>
                <Send size={15} /> Send query
              </button>
            </form>

            <div className="support-ticket-list support-ticket-list--drawer">
              {recentTickets.length ? recentTickets.map((ticket) => {
                const active = ticket.id === selectedTicketId;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    className={`support-ticket-item ${active ? 'active' : ''} ${isUnread(ticket) ? 'unread' : ''}`}
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <div className="support-ticket-item-head">
                      <div>
                        <div className="support-ticket-subject">{ticket.subject}</div>
                        <div className="support-ticket-company">{ticket.company || 'Platform'} · {ticket.createdBy.name}</div>
                      </div>
                      <span className="support-pill" style={{ background: STATUS_META[ticket.status].bg, color: STATUS_META[ticket.status].color }}>
                        {STATUS_META[ticket.status].label}
                      </span>
                    </div>
                    <div className="support-ticket-snippet">{ticket.latestMessage?.body || 'No updates yet'}</div>
                  </button>
                );
              }) : (
                <div className="empty-state card" style={{ margin: 0 }}>
                  <p>No support requests yet.</p>
                </div>
              )}
            </div>
          </section>

          <section className="support-drawer-panel support-drawer-thread">
            <div className="support-panel-head">
              <div>
                <p className="task-edit-eyebrow">Thread</p>
                <h4>{currentTicket ? currentTicket.subject : 'Select a query'}</h4>
              </div>
              <div className="support-thread-meta">
                <Clock3 size={15} />
                <span>{currentTicket ? formatDateTime(currentTicket.updatedAt) : 'Live'}</span>
              </div>
            </div>

            {currentTicket ? (
              <>
                <div className="support-message-list">
                  {(currentTicket as SupportTicketDetail).messages?.map((messageItem) => {
                    const mine = messageItem.sender.id === user?.id;
                    return (
                      <div key={messageItem.id} className={`support-message ${mine ? 'mine' : ''}`}>
                        <div className="support-message-meta">
                          <strong>{messageItem.sender.name}</strong>
                          <span>{formatDateTime(messageItem.createdAt)}</span>
                        </div>
                        <div className="support-message-bubble">{messageItem.body}</div>
                      </div>
                    );
                  })}
                </div>

                <form className="support-reply-form" onSubmit={sendReply}>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Type a follow-up message"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="support-reply-actions">
                    <span className="task-comments-sub">Replies stay attached to this thread.</span>
                    <button className="btn btn-primary btn-sm" type="submit" disabled={!reply.trim() || replyTicket.isPending}>
                      <Send size={15} /> Reply
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="empty-state card" style={{ margin: 0 }}>
                <ArrowRight size={24} />
                <h3>No ticket selected</h3>
                <p>Create a query or select one from the list to continue.</p>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
