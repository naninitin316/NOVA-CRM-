import type { Task } from '@/types';

export const ONLINE_LEADS_SEEN_EVENT = 'crm-online-leads-seen';

export function onlineLeadSeenKey(userId?: string, company?: string) {
  return `online-leads-seen:${userId || 'anonymous'}:${company || 'all'}`;
}

export function readSeenOnlineLeadIds(userId?: string, company?: string) {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const set = new Set<string>();

    // Always read from global 'all' bucket
    const rawAll = window.localStorage.getItem(onlineLeadSeenKey(userId, 'all'));
    if (rawAll) {
      const parsed = JSON.parse(rawAll);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => typeof item === 'string' && set.add(item));
      }
    }

    // If a specific company is requested, also read from company bucket
    if (company && company !== 'all') {
      const rawCompany = window.localStorage.getItem(onlineLeadSeenKey(userId, company));
      if (rawCompany) {
        const parsed = JSON.parse(rawCompany);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => typeof item === 'string' && set.add(item));
        }
      }
    }

    return set;
  } catch {
    return new Set<string>();
  }
}

export function markOnlineLeadsSeen(leads: Pick<Task, 'id'>[], userId?: string, company?: string) {
  if (typeof window === 'undefined' || !leads.length) return;
  const leadIds = leads.map((l) => l.id);

  // 1. Mark in global 'all' bucket
  const seenAll = readSeenOnlineLeadIds(userId, 'all');
  leadIds.forEach((id) => seenAll.add(id));
  window.localStorage.setItem(onlineLeadSeenKey(userId, 'all'), JSON.stringify(Array.from(seenAll)));

  // 2. If a specific company was passed, mark in that company bucket too
  if (company && company !== 'all') {
    const seenCompany = readSeenOnlineLeadIds(userId, company);
    leadIds.forEach((id) => seenCompany.add(id));
    window.localStorage.setItem(onlineLeadSeenKey(userId, company), JSON.stringify(Array.from(seenCompany)));
  }

  // Trigger cross-component reactive update
  window.dispatchEvent(new CustomEvent(ONLINE_LEADS_SEEN_EVENT));
}
