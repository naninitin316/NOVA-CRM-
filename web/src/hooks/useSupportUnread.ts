import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSupportTickets } from '@/hooks/useApi';
import type { RootState } from '@/store';
import type { Role, SupportTicketSummary } from '@/types';

const SUPPORT_READ_EVENT = 'crm-support-read-updated';
const SUPPORT_ROLES: Role[] = ['SUPPORT', 'SUPER_ADMIN'];

function storageKey(userId?: string) {
  return userId ? `nova_support_read_${userId}` : '';
}

function readMap(userId?: string): Record<string, string> {
  if (!userId) return {};
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMap(userId: string, value: Record<string, string>) {
  localStorage.setItem(storageKey(userId), JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(SUPPORT_READ_EVENT));
}

function isSupportRole(role?: Role | string) {
  return SUPPORT_ROLES.includes(role as Role);
}

export function isSupportTicketUnread(ticket: SupportTicketSummary, user?: { id: string; role: Role } | null, readState: Record<string, string> = {}) {
  const latest = ticket.latestMessage;
  if (!user || !latest || latest.sender.id === user.id) return false;

  const userIsSupport = isSupportRole(user.role);
  const senderIsSupport = isSupportRole(latest.sender.role);
  const isOwnQuery = ticket.createdBy.id === user.id;
  const isFromOtherSide = userIsSupport ? !senderIsSupport : isOwnQuery && senderIsSupport;

  return isFromOtherSide && readState[ticket.id] !== latest.id;
}

export function useSupportUnread(enabled = true) {
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: tickets = [] } = useSupportTickets(undefined, enabled && Boolean(user));
  const [readState, setReadState] = useState<Record<string, string>>(() => readMap(user?.id));

  useEffect(() => {
    setReadState(readMap(user?.id));
  }, [user?.id]);

  useEffect(() => {
    const sync = () => setReadState(readMap(user?.id));
    window.addEventListener(SUPPORT_READ_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SUPPORT_READ_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [user?.id]);

  const markTicketRead = useCallback((ticket?: SupportTicketSummary | null) => {
    if (!user?.id || !ticket?.latestMessage) return;
    const next = { ...readMap(user.id), [ticket.id]: ticket.latestMessage.id };
    writeMap(user.id, next);
    setReadState(next);
  }, [user?.id]);

  const unreadTickets = useMemo(
    () => tickets.filter((ticket) => isSupportTicketUnread(ticket, user, readState)),
    [readState, tickets, user]
  );

  return {
    unreadCount: unreadTickets.length,
    unreadTickets,
    readState,
    markTicketRead,
    isUnread: (ticket: SupportTicketSummary) => isSupportTicketUnread(ticket, user, readState),
  };
}
