import { Request, Response } from 'express';
import { DEFAULT_META_PAGE_ACCESS_TOKEN, metaLeadService } from '../services/meta-lead.service';

/**
 * Handle Meta Webhook verification handshake (GET /api/webhooks/meta)
 */
export const verifyMetaWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && expectedToken && token === expectedToken) {
      console.log('[Meta Webhook] Verification successful. Responding with challenge.');
      res.status(200).send(String(challenge));
      return;
    }
    console.warn('[Meta Webhook] Verification failed. Token mismatch or unsupported mode.');
    res.status(403).send('Verification failed: Invalid verify token or mode.');
    return;
  }

  res.status(400).send('Bad Request: Missing hub parameters.');
};

/**
 * Handle incoming Meta Lead Webhook events (POST /api/webhooks/meta)
 */
export const receiveMetaWebhook = (req: Request, res: Response) => {
  const body = req.body;

  // Immediately acknowledge receipt to Meta to prevent timeout/retries
  res.status(200).send('EVENT_RECEIVED');

  if (body.object === 'page' && Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      if (Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen' && change.value?.leadgen_id) {
            void metaLeadService.processLeadgenEvent(change.value).catch((err) => {
              console.error('[Meta Webhook] Error processing leadgen event in background:', err);
            });
          }
        }
      }
    }
  }
};

/**
 * Webhook endpoint info / health check
 */
export const getWebhookInfo = (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Nova CRM Meta Webhook endpoint is active.',
    webhookUrl: 'https://crm.nrinnovium.online/api/webhooks/meta',
    subscribedFields: ['leadgen'],
  });
};

/**
 * Backfill / Sync existing leads from Meta Instant Form
 */
export const syncMetaLeads = async (req: Request, res: Response) => {
  const formId = req.body?.formId || (req.query?.formId as string) || '1693236231771414';
  const accessToken =
    req.body?.accessToken ||
    (req.query?.accessToken as string) ||
    process.env.META_PAGE_ACCESS_TOKEN ||
    DEFAULT_META_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    res.status(400).json({
      success: false,
      error: 'META_PAGE_ACCESS_TOKEN is missing. Provide accessToken in body/query or set META_PAGE_ACCESS_TOKEN in backend/.env',
    });
    return;
  }

  try {
    const leads = await metaLeadService.syncFormLeads(formId, accessToken);
    res.json({
      success: true,
      message: `Successfully synced ${leads.length} lead(s) from Meta form ${formId} into Komu Infra.`,
      count: leads.length,
      data: leads,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync leads from Meta',
    });
  }
};

