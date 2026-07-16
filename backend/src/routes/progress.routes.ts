import { Router } from 'express';
import { authenticate, checkPermission } from '../middleware/auth';
import { getAnalytics, getProgressLogs } from '../controllers/progress.controller';

const router = Router();

router.use(authenticate);

router.get('/analytics', checkPermission('progress', 'read'), getAnalytics);
router.get('/logs/:taskId', checkPermission('progress', 'read'), getProgressLogs);

export default router;
