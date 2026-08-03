import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import {
  idParamValidation,
  onlineLeadAssignValidation,
  onlineLeadCreateValidation,
  validate,
} from '../middleware/validation';
import { assignOnlineLead, createOnlineLead, getOnlineLeads } from '../controllers/online-lead.controller';

const router = Router();

router.post('/', onlineLeadCreateValidation, validate, createOnlineLead);

router.use(authenticate);

router.get('/', authorize(Role.SUPER_ADMIN, Role.ADMIN), getOnlineLeads);
router.patch('/:id/assign', idParamValidation, onlineLeadAssignValidation, validate, authorize(Role.SUPER_ADMIN, Role.ADMIN), assignOnlineLead);

export default router;
