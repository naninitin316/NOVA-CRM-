import { Router } from 'express';
import { authenticate, checkPermission } from '../middleware/auth';
import {
  validate,
  taskValidation,
  taskCommentValidation,
  bulkLeadTaskValidation,
  taskUpdateValidation,
  idParamValidation,
  taskQueryValidation,
} from '../middleware/validation';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  addTaskComment,
  createLeadTasks,
} from '../controllers/task.controller';

const router = Router();

router.use(authenticate);

router.get('/', taskQueryValidation, validate, checkPermission('tasks', 'read'), getTasks);
router.get('/:id', idParamValidation, validate, checkPermission('tasks', 'read'), getTaskById);
router.post('/', taskValidation, validate, checkPermission('tasks', 'create'), createTask);
router.post('/bulk-leads', bulkLeadTaskValidation, validate, checkPermission('tasks', 'create'), createLeadTasks);
router.put('/:id', idParamValidation, taskUpdateValidation, validate, checkPermission('tasks', 'update'), updateTask);
router.delete('/:id', idParamValidation, validate, checkPermission('tasks', 'delete'), deleteTask);
router.patch('/:id/assign', idParamValidation, validate, checkPermission('tasks', 'assign'), assignTask);
router.post('/:id/comments', idParamValidation, taskCommentValidation, validate, checkPermission('tasks', 'update'), addTaskComment);

export default router;
