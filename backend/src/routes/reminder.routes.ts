import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { idParamValidation, validate } from '../middleware/validation';
import { createReminder, dismissReminder, getReminders } from '../controllers/reminder.controller';

const router = Router();

router.use(authenticate);

router.get('/', [
  query('due').optional().isBoolean().withMessage('Invalid due filter'),
], validate, getReminders);

router.post('/', [
  body('taskId').isUUID().withMessage('Task is required'),
  body('remindAt').isISO8601().withMessage('Reminder date is required'),
  body('note').optional({ checkFalsy: true }).isString(),
], validate, createReminder);

router.patch('/:id/dismiss', idParamValidation, validate, dismissReminder);

export default router;
