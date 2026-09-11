import { Router } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { externalLeadCreateValidation, validate } from '../middleware/validation';
import { createLead, getLeadApiInfo } from '../controllers/lead.controller';

const router = Router();

// Protect all /api/leads routes with the API Key
router.use(apiKeyAuth);

router.get('/', getLeadApiInfo);
router.post('/', externalLeadCreateValidation, validate, createLead);

export default router;
