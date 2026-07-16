import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  validate,
  supportTicketCreateValidation,
  supportTicketReplyValidation,
  supportTicketUpdateValidation,
  idParamValidation,
} from '../middleware/validation';
import {
  createSupportTicket,
  getSupportTicketById,
  getSupportTickets,
  replyToSupportTicket,
  updateSupportTicket,
} from '../controllers/support.controller';

const router = Router();

router.use(authenticate);

router.get('/tickets', getSupportTickets);
router.post('/tickets', supportTicketCreateValidation, validate, createSupportTicket);
router.get('/tickets/:id', idParamValidation, validate, getSupportTicketById);
router.post('/tickets/:id/messages', idParamValidation, supportTicketReplyValidation, validate, replyToSupportTicket);
router.patch('/tickets/:id', idParamValidation, supportTicketUpdateValidation, validate, updateSupportTicket);

export default router;
