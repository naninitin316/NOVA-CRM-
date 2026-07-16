import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { isAxiosError } from 'axios';
import { AlertCircle, CheckCircle2, Headset, Inbox, Send, Sparkles, User2, UserPlus } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Toast } from '@/components/ui/Toast';
import {
  useCreateSupportTicket,
  useCreateUser,
  useReplySupportTicket,
  useSupportTicket,
  useSupportTickets,
  useUpdateSupportTicket,
  useUsers,
} from '@/hooks/useApi';
import { useSupportUnread } from '@/hooks/useSupportUnread';
import type { RootState } from '@/store';
import type { SupportStatus, SupportTicketDetail, SupportTicketSummary, User } from '@/types';

const STATUS_META: Record<SupportStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: 'var(--secondary)', bg: 'rgba(14,165,233,0.12)' },
  IN_PROGRESS: { label: 'In progress', color: 'var(--warning)', bg: 'rgba(245,158,11,0.14)' },
  RESOLVED: { label: 'Resolved', color: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
  CLOSED: { label: 'Closed', color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.14)' },
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function SupportPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isSupportStaff = user?.role === 'SUPPORT' || user?.role === 'SUPER_ADMIN';
  const [scope, setScope] = useState<SupportStatus | 'ALL'>('ALL');
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [showSupportUserForm, setShowSupportUserForm] = useState(false);
  const [supportUserForm, setSupportUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [toast, setToast] = useState<{ text: string; kind?: 'success' | 'error' } | null>(null);

  const { data: users } = useUsers(isSupportStaff);
  const { data: allTickets = [] } = useSupportTickets();
  const { isUnread, markTicketRead } = useSupportUnread();
  const { data: ticketDetail, isLoading: ticketLoading } = useSupportTicket(selectedTicketId);
  const createTicket = useCreateSupportTicket();
  const createUser = useCreateUser();
  const replyTicket = useReplySupportTicket();
  const updateTicket = useUpdateSupportTicket();

  const supportUsers = useMemo(
    () => (users || []).filter((item) => item.role === 'SUPPORT'),
    [users]
  );

  const tickets = useMemo(() => {
    if (!isSupportStaff) return allTickets;
    if (scope === 'ALL') return allTickets;
    return allTickets.filter((ticket) => ticket.status === scope);
  }, [allTickets, isSupportStaff, scope]);

  useEffect(() => {
    if (!selectedTicketId && tickets.length) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [selectedTicketId, tickets]);

  useEffect(() => {
    if (selectedTicketId && !tickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(tickets[0]?.id);
    }
  }, [selectedTicketId, tickets]);

  useEffect(() => {
    if (!ticketDetail && tickets[0]?.id && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [ticketDetail, tickets, selectedTicketId]);

  const currentTicket = (ticketDetail || tickets.find((ticket) => ticket.id === selectedTicketId)) as SupportTicketDetail | SupportTicketSummary | undefined;

  useEffect(() => {
    if (currentTicket) {
      markTicketRead(currentTicket);
    }
  }, [currentTicket, markTicketRead]);

  const counts = useMemo(() => ({
    total: allTickets.length,
    open: allTickets.filter((ticket) => ticket.status === 'OPEN').length,
    progress: allTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    resolved: allTickets.filter((ticket) => ticket.status === 'RESOLVED').length,
  }), [allTickets]);

  const handleCreateTicket = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanSubject || !cleanMessage) return;

    createTicket.mutate(
      { subject: cleanSubject, message: cleanMessage },
      {
        onSuccess: (response) => {
          const ticket = response.data.data;
          if (ticket?.id) setSelectedTicketId(ticket.id);
          setSubject('');
          setMessage('');
          setToast({ text: 'Successfully done. Support request created.', kind: 'success' });
        },
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Support request could not be created.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  const handleCreateSupportUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createUser.isPending) return;

    const name = supportUserForm.name.trim();
    const email = supportUserForm.email.trim();
    const password = supportUserForm.password.trim();
    const phone = supportUserForm.phone.trim();
    if (!name || !email || !password) {
      setToast({ text: 'Name, email, and password are required.', kind: 'error' });
      return;
    }

    createUser.mutate(
      {
        name,
        email,
        password,
        role: 'SUPPORT',
        company: 'Platform',
        phone,
      },
      {
        onSuccess: (response) => {
          const welcomeEmail = (response.data.data as User & {
            welcomeEmail?: { sent?: boolean; skipped?: boolean; error?: string };
          } | undefined)?.welcomeEmail;
          setToast({
            text: welcomeEmail && !welcomeEmail.sent
              ? `Support user created, mail not sent: ${welcomeEmail.error || 'SMTP did not send the message.'}`
              : 'Successfully done. Support user created and welcome email sent.',
            kind: 'success',
          });
          setSupportUserForm({ name: '', email: '', password: '', phone: '' });
          setShowSupportUserForm(false);
        },
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Support user could not be created.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  const handleReply = (event: FormEvent<HTMLFormElement>) => {
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

  const handleAssignToMe = () => {
    if (!selectedTicketId || !user) return;
    updateTicket.mutate(
      { id: selectedTicketId, data: { assignedToId: user.id, status: 'IN_PROGRESS' } },
      {
        onSuccess: () => setToast({ text: 'Successfully done. Ticket assigned to you.', kind: 'success' }),
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Ticket could not be assigned.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  const handleStatusChange = (status: SupportStatus) => {
    if (!selectedTicketId) return;
    updateTicket.mutate(
      { id: selectedTicketId, data: { status } },
      {
        onSuccess: () => setToast({ text: 'Successfully done. Ticket status updated.', kind: 'success' }),
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Ticket status could not be updated.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  const handleTicketStatusChange = (ticketId: string, status: SupportStatus) => {
    updateTicket.mutate(
      { id: ticketId, data: { status } },
      {
        onSuccess: () => setToast({ text: 'Successfully done. Query status updated.', kind: 'success' }),
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Query status could not be updated.';
          setToast({ text: apiMessage, kind: 'error' });
        },
      }
    );
  };

  const renderTicketItem = (ticket: SupportTicketSummary) => {
    const active = ticket.id === selectedTicketId;
    const latestMessage = ticket.latestMessage?.body || 'No updates yet';
    return (
      <button
        key={ticket.id}
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
        <div className="support-ticket-snippet">{latestMessage}</div>
        <div className="support-ticket-meta">
          <span>{ticket.messageCount || 0} messages</span>
          <span>{formatDateTime(ticket.updatedAt)}</span>
        </div>
        {isSupportStaff && (
          <div className="support-ticket-status-row" onClick={(event) => event.stopPropagation()}>
            <span>Status</span>
            <select
              className="form-input support-ticket-status-select"
              value={ticket.status}
              disabled={updateTicket.isPending}
              onChange={(event) => handleTicketStatusChange(ticket.id, event.target.value as SupportStatus)}
            >
              {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((status) => (
                <option key={status} value={status}>{STATUS_META[status].label}</option>
              ))}
            </select>
          </div>
        )}
      </button>
    );
  };

  const messages = (currentTicket as SupportTicketDetail | undefined)?.messages || [];

  return (
    <>
      <TopBar title="Support" />
      <div className="page support-page">
        <Toast open={!!toast} text={toast?.text || ''} kind={toast?.kind || 'success'} onClose={() => setToast(null)} />

        <div className="page-header support-hero">
          <div>
            <h2 className="page-heading">Support</h2>
            <p className="page-desc">
              {isSupportStaff
                ? 'Handle company and user queries from one shared inbox.'
                : 'Send your queries to support and track the conversation here.'}
            </p>
          </div>
          <div className="support-kpis">
            <div className="support-kpi">
              <span>Total</span>
              <strong>{counts.total}</strong>
            </div>
            <div className="support-kpi">
              <span>Open</span>
              <strong>{counts.open}</strong>
            </div>
            <div className="support-kpi">
              <span>Working</span>
              <strong>{counts.progress}</strong>
            </div>
            <div className="support-kpi">
              <span>Resolved</span>
              <strong>{counts.resolved}</strong>
            </div>
          </div>
        </div>

        <div className="support-layout">
          <aside className="support-sidebar-pane">
            {isSuperAdmin && (
              <div className="card support-team-card">
                <div className="support-card-head">
                  <div>
                    <p className="task-edit-eyebrow">Platform team</p>
                    <h3 className="task-detail-section-title" style={{ marginBottom: 0 }}>Support users</h3>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowSupportUserForm((value) => !value)}
                  >
                    <UserPlus size={15} /> Add
                  </button>
                </div>

                <div className="support-team-list">
                  {supportUsers.length ? supportUsers.map((supportUser) => (
                    <div key={supportUser.id} className="support-team-item">
                      <div>
                        <strong>{supportUser.name}</strong>
                        <span>{supportUser.email}</span>
                      </div>
                      <span className={`support-team-status ${supportUser.isActive ? 'active' : ''}`}>
                        {supportUser.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  )) : (
                    <p className="task-comments-sub">No support users added yet.</p>
                  )}
                </div>

                {showSupportUserForm && (
                  <form className="support-form support-user-form" onSubmit={handleCreateSupportUser}>
                    <input
                      className="form-input"
                      placeholder="Support user name"
                      value={supportUserForm.name}
                      onChange={(event) => setSupportUserForm((current) => ({ ...current, name: event.target.value }))}
                    />
                    <input
                      className="form-input"
                      type="email"
                      placeholder="Email"
                      value={supportUserForm.email}
                      onChange={(event) => setSupportUserForm((current) => ({ ...current, email: event.target.value }))}
                    />
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Temporary password"
                      value={supportUserForm.password}
                      onChange={(event) => setSupportUserForm((current) => ({ ...current, password: event.target.value }))}
                    />
                    <input
                      className="form-input"
                      placeholder="Phone optional"
                      value={supportUserForm.phone}
                      onChange={(event) => setSupportUserForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                    <div className="support-user-form-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={createUser.isPending}
                        onClick={() => setShowSupportUserForm(false)}
                      >
                        Cancel
                      </button>
                      <button className="btn btn-primary btn-sm" type="submit" disabled={createUser.isPending}>
                        <UserPlus size={15} /> {createUser.isPending ? 'Creating...' : 'Create support user'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {!isSupportStaff && (
              <div className="card support-compose-card">
                <div className="support-card-head">
                  <div>
                    <p className="task-edit-eyebrow">New request</p>
                    <h3 className="task-detail-section-title" style={{ marginBottom: 0 }}>Message support</h3>
                  </div>
                  <Sparkles size={18} color="var(--primary)" />
                </div>
                <form onSubmit={handleCreateTicket} className="support-form">
                  <input
                    className="form-input"
                    placeholder="Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                  <textarea
                    className="form-input"
                    rows={5}
                    placeholder="Describe the issue, question, or request"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={createTicket.isPending}>
                    <Send size={15} /> Send
                  </button>
                </form>
              </div>
            )}

            <div className="card support-inbox-card">
              <div className="support-card-head" style={{ marginBottom: 14 }}>
                <div>
                  <p className="task-edit-eyebrow">{isSupportStaff ? 'Inbox' : 'My requests'}</p>
                  <h3 className="task-detail-section-title" style={{ marginBottom: 0 }}>
                    {isSupportStaff ? 'Ticket queue' : 'Your conversations'}
                  </h3>
                </div>
                <Inbox size={18} color="var(--primary)" />
              </div>

              {isSupportStaff && (
                <div className="segmented-control support-filter" style={{ marginBottom: 12 }}>
                  {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`segmented-control-item ${scope === item ? 'active' : ''}`}
                      onClick={() => setScope(item)}
                    >
                      {item === 'ALL' ? 'All' : STATUS_META[item].label}
                    </button>
                  ))}
                </div>
              )}

              <div className="support-ticket-list">
                {tickets.length ? tickets.map(renderTicketItem) : (
                  <div className="empty-state card" style={{ marginTop: 0 }}>
                    <AlertCircle size={20} />
                    <h3>No support tickets yet</h3>
                    <p>{isSupportStaff ? 'New tickets will appear here automatically.' : 'Send a request to start the conversation.'}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="support-thread card">
            <div className="support-thread-head">
              <div>
                <p className="task-edit-eyebrow">Conversation</p>
                <h3 className="task-detail-section-title" style={{ marginBottom: 0 }}>
                  {currentTicket ? currentTicket.subject : 'Select a ticket'}
                </h3>
                <div className="task-comments-sub">
                  {currentTicket ? `${currentTicket.createdBy.name} · ${currentTicket.company || 'Platform'}` : 'Choose a conversation from the inbox'}
                </div>
              </div>
              <div className="support-thread-actions">
                {currentTicket && (
                  <span className="support-pill" style={{ background: STATUS_META[currentTicket.status].bg, color: STATUS_META[currentTicket.status].color }}>
                    {STATUS_META[currentTicket.status].label}
                  </span>
                )}
                {isSupportStaff && currentTicket && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleAssignToMe}>
                    <User2 size={15} /> Take ticket
                  </button>
                )}
              </div>
            </div>

            {isSupportStaff && currentTicket && (
              <div className="support-admin-strip">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={currentTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value as SupportStatus)}
                  >
                    {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((status) => (
                      <option key={status} value={status}>{STATUS_META[status].label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Assigned to</label>
                    <select
                      className="form-input"
                      value={currentTicket.assignedTo?.id || ''}
                      onChange={(e) => updateTicket.mutate({
                        id: currentTicket.id,
                        data: { assignedToId: e.target.value || null },
                      }, {
                        onSuccess: () => setToast({ text: 'Successfully done. Ticket assigned.', kind: 'success' }),
                        onError: (err) => {
                          const apiMessage = isAxiosError(err)
                            ? err.response?.data?.error || err.response?.data?.message || err.message
                            : 'Ticket could not be assigned.';
                          setToast({ text: apiMessage, kind: 'error' });
                        },
                      })}
                    >
                    <option value="">Unassigned</option>
                    {supportUsers.map((supportUser: User) => (
                      <option key={supportUser.id} value={supportUser.id}>{supportUser.name} · {supportUser.email}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="support-thread-body">
              {ticketLoading ? (
                <div className="support-loading">
                  <div className="spinner" />
                </div>
              ) : currentTicket ? (
                <>
                  <div className="support-message-list">
                    {messages.map((messageItem) => {
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

                  <form className="support-reply-form" onSubmit={handleReply}>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder={isSupportStaff ? 'Write a response to the company or user' : 'Add another message to your request'}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <div className="support-reply-actions">
                      <div className="task-comments-sub">
                        <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                        Messages update the thread instantly.
                      </div>
                      <button className="btn btn-primary btn-sm" type="submit" disabled={!reply.trim() || replyTicket.isPending}>
                        <Send size={15} /> Reply
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="empty-state card" style={{ margin: 0 }}>
                  <Headset size={24} />
                  <h3>No ticket selected</h3>
                  <p>Select a support thread to continue the conversation.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
