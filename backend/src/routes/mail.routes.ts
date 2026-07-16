import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { getMailStatus, sendTestMail, verifyMail } from '../controllers/mail.controller';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN));

router.get('/status', getMailStatus);
router.post('/verify', verifyMail);
router.post('/test', sendTestMail);

export default router;
