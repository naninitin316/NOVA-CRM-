import { onlineLeadService } from './online-lead.service';

interface MetaFieldData {
  name: string;
  values: string[];
}

interface MetaLeadgenResponse {
  id: string;
  created_time?: string | number;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  form_name?: string;
  field_data?: MetaFieldData[];
}

interface MetaLeadgenPayloadValue {
  ad_id?: string;
  form_id?: string;
  leadgen_id: string;
  created_time?: number;
  page_id?: string;
  adgroup_id?: string;
}

export const DEFAULT_META_PAGE_ACCESS_TOKEN =
  'EAIhdrl6MMjEBSbEG5NB0orOvpUDwbRQ8hhOKcx7GgoAxw8erxuB28voX4hTGqYsHeRQnyJ1Qui4dsbFAjrzZCQxbS13E29AuSCqcLmFtkPcjR192NkDvZC6cmdh3qo0CvgeGjlHyImqsffZAoBshVYj0zoSQh3rGZBlEhu6EFXvDJXSX1SelMbcRJd7xZBqZCZADCnBfqbz';

export class MetaLeadService {
  private graphApiVersion = 'v21.0';

  /**
   * Fetch lead details from Meta Graph API
   */
  async fetchLeadDetails(leadgenId: string, pageAccessToken: string): Promise<MetaLeadgenResponse> {
    const url = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(pageAccessToken)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorText;
      } catch {
        // use raw text
      }
      throw new Error(`Meta Graph API error (${response.status}): ${errorMessage}`);
    }

    return (await response.json()) as MetaLeadgenResponse;
  }

  /**
   * Parse field_data array returned by Meta
   */
  parseFieldData(fieldData: MetaFieldData[] = []) {
    let name = '';
    let firstName = '';
    let lastName = '';
    let phone = '';
    let email = '';
    const otherDetails: string[] = [];

    for (const field of fieldData) {
      const fieldName = (field.name || '').toLowerCase().trim();
      const val = (field.values?.[0] || '').trim();
      if (!val) continue;

      if (['full_name', 'name', 'your_name'].includes(fieldName)) {
        name = val;
      } else if (['first_name', 'given_name'].includes(fieldName)) {
        firstName = val;
      } else if (['last_name', 'surname'].includes(fieldName)) {
        lastName = val;
      } else if (['phone_number', 'phone', 'mobile_number', 'contact_number'].includes(fieldName)) {
        phone = val;
      } else if (['email', 'email_address'].includes(fieldName)) {
        email = val;
      } else {
        // Collect custom questionnaire answers
        const formattedLabel = field.name.replace(/_/g, ' ');
        otherDetails.push(`${formattedLabel}: ${field.values.join(', ')}`);
      }
    }

    if (!name && (firstName || lastName)) {
      name = [firstName, lastName].filter(Boolean).join(' ');
    }

    return {
      name,
      phone,
      email,
      otherDetails: otherDetails.join('\n'),
    };
  }

  /**
   * Process incoming webhook leadgen event
   */
  async processLeadgenEvent(event: MetaLeadgenPayloadValue) {
    const { leadgen_id, form_id, page_id } = event;
    const token = process.env.META_PAGE_ACCESS_TOKEN || DEFAULT_META_PAGE_ACCESS_TOKEN;

    if (!token) {
      console.error('[Meta Webhook] META_PAGE_ACCESS_TOKEN is not set. Cannot fetch leadgen details for ID:', leadgen_id);
      return;
    }

    try {
      console.log(`[Meta Webhook] Fetching leadgen_id: ${leadgen_id} (Form: ${form_id || 'unknown'})`);
      const leadData = await this.fetchLeadDetails(leadgen_id, token);
      const parsed = this.parseFieldData(leadData.field_data);

      // Map Form & Company
      // Form 1693236231771414 is Komu Infra - Shades of Green campaign
      let company = process.env.META_DEFAULT_COMPANY || 'Komu Infra';
      let project = process.env.META_DEFAULT_PROJECT || 'Shades of Green';
      let sourceName = 'Meta Ads - Shades of Green';

      const resolvedFormId = form_id || leadData.form_id;
      if (resolvedFormId === '1693236231771414') {
        company = 'Komu Infra';
        project = 'Shades of Green';
        sourceName = 'Meta Ads - Shades of Green (Form: 1693236231771414)';
      } else if (resolvedFormId) {
        sourceName = `Meta Ads (Form: ${resolvedFormId})`;
      }

      // Format created date
      let createdAt: Date | undefined;
      const rawTime = leadData.created_time || event.created_time;
      if (typeof rawTime === 'number') {
        createdAt = new Date(rawTime * 1000);
      } else if (typeof rawTime === 'string') {
        createdAt = new Date(rawTime);
      }

      // Compile message / notes
      const notes = [
        `Lead Source: ${sourceName}`,
        resolvedFormId ? `Form ID: ${resolvedFormId}` : '',
        leadgen_id ? `Meta Lead ID: ${leadgen_id}` : '',
        page_id ? `Page ID: ${page_id}` : '',
        parsed.otherDetails ? `\nForm Responses:\n${parsed.otherDetails}` : '',
      ].filter(Boolean).join('\n');

      const savedLead = await onlineLeadService.createOnlineLead({
        company,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        project,
        message: notes,
        source: sourceName,
        createdAt,
      });

      console.log(`[Meta Webhook] Successfully recorded lead: ${savedLead.id} for company: ${company} (Project: ${project})`);
      return savedLead;
    } catch (error) {
      console.error(`[Meta Webhook] Failed to process leadgen_id ${leadgen_id}:`, error);
      throw error;
    }
  }

  /**
   * Fetch and import all existing/historical leads from a Meta Instant Form
   */
  async syncFormLeads(formId = '1693236231771414', pageAccessToken?: string) {
    const token = pageAccessToken || process.env.META_PAGE_ACCESS_TOKEN || DEFAULT_META_PAGE_ACCESS_TOKEN;
    if (!token) {
      throw new Error('META_PAGE_ACCESS_TOKEN is required to sync leads from Meta.');
    }

    let url: string | null = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(formId)}/leads?access_token=${encodeURIComponent(token)}&fields=id,created_time,field_data&limit=100`;

    const importedLeads = [];
    let pageCount = 0;

    while (url && pageCount < 20) {
      pageCount++;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Meta Graph API error (${response.status}): ${errorText}`);
      }

      const json = (await response.json()) as {
        data?: Array<{ id: string; created_time?: string; field_data?: MetaFieldData[] }>;
        paging?: { next?: string };
      };

      const leads = json.data || [];
      for (const item of leads) {
        const parsed = this.parseFieldData(item.field_data);
        const sourceName = formId === '1693236231771414'
          ? 'Meta Ads - Shades of Green (Form: 1693236231771414)'
          : `Meta Ads (Form: ${formId})`;

        const notes = [
          `Lead Source: ${sourceName}`,
          `Form ID: ${formId}`,
          `Meta Lead ID: ${item.id}`,
          parsed.otherDetails ? `\nForm Responses:\n${parsed.otherDetails}` : '',
        ].filter(Boolean).join('\n');

        const savedLead = await onlineLeadService.createOnlineLead({
          company: 'Komu Infra',
          name: parsed.name,
          phone: parsed.phone,
          email: parsed.email,
          project: 'Shades of Green',
          message: notes,
          source: sourceName,
          createdAt: item.created_time ? new Date(item.created_time) : undefined,
        });

        importedLeads.push(savedLead);
      }

      url = json.paging?.next || null;
    }

    return importedLeads;
  }

  private syncTimer: NodeJS.Timeout | null = null;

  /**
   * Continuous background lead synchronization worker.
   * Runs periodically to ensure zero leads are ever missed even if a webhook drops.
   */
  startBackgroundSync(intervalMs = 10 * 60 * 1000) {
    if (this.syncTimer) return;

    const runSync = async () => {
      const token = process.env.META_PAGE_ACCESS_TOKEN || DEFAULT_META_PAGE_ACCESS_TOKEN;
      if (!token) return;

      try {
        const formId = process.env.META_FORM_ID || '1693236231771414';
        const synced = await this.syncFormLeads(formId, token);
        if (synced && synced.length > 0) {
          console.log(`[Meta Lead Auto-Sync] Automatically synced/verified ${synced.length} lead(s) for Komu Infra.`);
        }
      } catch (err: any) {
        console.warn('[Meta Lead Auto-Sync] Background sync check:', err.message || err);
      }
    };

    // Run first sync 15 seconds after server start, then every intervalMs (e.g. 10 mins)
    setTimeout(() => {
      void runSync();
      this.syncTimer = setInterval(() => void runSync(), intervalMs);
    }, 15000);

    console.log(`[Meta Lead Auto-Sync] Background polling worker initialized (runs every ${intervalMs / 60000} minutes).`);
  }
}

export const metaLeadService = new MetaLeadService();
