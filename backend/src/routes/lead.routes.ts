import { Router } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { externalLeadCreateValidation, validate } from '../middleware/validation';
import { createLead, deleteLead, getLeadApiInfo } from '../controllers/lead.controller';

const router = Router();

// Protect all /api/leads routes with the API Key
router.use(apiKeyAuth);

router.get('/', getLeadApiInfo);
router.post('/', externalLeadCreateValidation, validate, createLead);
router.delete('/:id', deleteLead);

export default router;
