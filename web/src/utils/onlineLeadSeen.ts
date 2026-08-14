import type { Task } from '@/types';

export const ONLINE_LEADS_SEEN_EVENT = 'crm-online-leads-seen';

export function onlineLeadSeenKey(userId?: string, company?: string) {
  return `online-leads-seen:${userId || 'anonymous'}:${company || 'all'}`;
}

export function readSeenOnlineLeadIds(userId?: string, company?: string) {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(onlineLeadSeenKey(userId, company));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

export function markOnlineLeadsSeen(leads: Pick<Task, 'id'>[], userId?: string, company?: string) {
  if (typeof window === 'undefined' || !leads.length) return;
  const seen = readSeenOnlineLeadIds(userId, company);
  leads.forEach((lead) => seen.add(lead.id));
  window.localStorage.setItem(onlineLeadSeenKey(userId, company), JSON.stringify(Array.from(seen)));
  window.dispatchEvent(new CustomEvent(ONLINE_LEADS_SEEN_EVENT));
}
