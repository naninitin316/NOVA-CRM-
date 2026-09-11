import { Router } from 'express';
import { getWebhookInfo, receiveMetaWebhook, verifyMetaWebhook } from '../controllers/webhook.controller';
import { getWebhookInfo, receiveMetaWebhook, syncMetaLeads, verifyMetaWebhook } from '../controllers/webhook.controller';

const router = Router();

// Meta Webhook Verification and Event Reception
router.get('/meta', verifyMetaWebhook);
router.post('/meta', receiveMetaWebhook);
router.get('/meta/info', getWebhookInfo);

// Sync historical / existing leads from Meta Instant Form
router.post('/meta/sync', syncMetaLeads);
router.get('/meta/sync', syncMetaLeads);

export default router;
