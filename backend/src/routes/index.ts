import { Router } from 'express';
import authRoutes from './auth.routes';
import taskRoutes from './task.routes';
import userRoutes from './user.routes';
import companyRoutes from './company.routes';
import progressRoutes from './progress.routes';
import supportRoutes from './support.routes';
import onlineLeadRoutes from './online-lead.routes';
import mailRoutes from './mail.routes';
import reminderRoutes from './reminder.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/progress', progressRoutes);
router.use('/support', supportRoutes);
router.use('/online-leads', onlineLeadRoutes);
router.use('/mail', mailRoutes);
router.use('/reminders', reminderRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CRM API is running', timestamp: new Date().toISOString() });
});

export default router;
