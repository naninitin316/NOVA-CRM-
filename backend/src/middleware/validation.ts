import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler';

const DEPARTMENT_OPTIONS = ['Sales', 'HR', 'IT', 'Administration', 'Finance', 'Engineering', 'Marketing', 'Support'] as const;

export const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(message, 400));
  }
  next();
};

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'CONTRIBUTOR', 'VIEWER', 'SUPPORT']).withMessage('Invalid role'),
  body('company').optional().isString(),
  body('department').optional().isIn(DEPARTMENT_OPTIONS).withMessage('Select a valid department'),
];

export const companyCreateValidation = [
  body('name').trim().notEmpty().withMessage('Company name is required'),
  body('director').trim().notEmpty().withMessage('Director name is required'),
  body('gstNo').trim().notEmpty().withMessage('GST number is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('logo').optional({ checkFalsy: true }).isString().withMessage('Company logo must be a valid image value'),
  body('employees').optional().isArray(),
  body('employees.*.name').optional().trim().notEmpty().withMessage('Employee name is required'),
  body('employees.*.email').optional().isEmail().withMessage('Valid employee email is required'),
  body('employees.*.password').optional().isLength({ min: 6 }).withMessage('Employee password must be at least 6 characters'),
  body('employees.*.role').optional().isIn(['ADMIN', 'MEMBER', 'CONTRIBUTOR', 'VIEWER']).withMessage('Invalid employee role'),
  body('employees.*.department').optional().isIn(DEPARTMENT_OPTIONS).withMessage('Select a valid department'),
  body('employees.*.phone').optional().isString(),
];

export const taskValidation = [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('description').optional().isString(),
  body('customerName').optional().isString(),
  body('customerPhone').optional().isString(),
  body('customerEmail').optional({ checkFalsy: true }).isEmail().withMessage('Valid customer email is required'),
  body('customerCompany').optional().isString(),
  body('customerSource').optional().isString(),
  body('assignedTo').optional().isUUID().withMessage('Invalid assignee ID'),
  body('status').optional().isIn(['PROCESSED', 'REJECTED', 'ON_HOLD']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('department').optional().isString(),
  body('remarks').optional().isString(),
  body('dueDate').optional().isISO8601(),
];

export const taskUpdateValidation = [
  body('title').optional().trim().notEmpty().withMessage('Task title is required'),
  body('description').optional().isString(),
  body('customerName').optional().isString(),
  body('customerPhone').optional().isString(),
  body('customerEmail').optional({ checkFalsy: true }).isEmail().withMessage('Valid customer email is required'),
  body('customerCompany').optional().isString(),
  body('customerSource').optional().isString(),
  body('assignedTo').optional().isUUID().withMessage('Invalid assignee ID'),
  body('status').optional().isIn(['PROCESSED', 'REJECTED', 'ON_HOLD']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('department').optional().isIn(DEPARTMENT_OPTIONS).withMessage('Select a valid department'),
  body('remarks').optional().isString(),
  body('dueDate').optional().isISO8601(),
];

export const taskCommentValidation = [
  body('comment').trim().notEmpty().withMessage('Comment is required'),
];

export const bulkLeadTaskValidation = [
  body('assignmentMode').isIn(['ROUND_ROBIN', 'MANUAL']).withMessage('Invalid assignment mode'),
  body('department').isIn(DEPARTMENT_OPTIONS).withMessage('Select a valid department'),
  body('leads').isArray({ min: 1 }).withMessage('At least one lead is required'),
  body('leads.*.customerName').optional().isString(),
  body('leads.*.customerPhone').optional().isString(),
  body('leads.*.customerEmail').optional({ checkFalsy: true }).isString(),
  body('leads.*.customerCompany').optional().isString(),
  body('leads.*.customerSource').optional().isString(),
  body('leads.*.description').optional().isString(),
  body('leads.*.remarks').optional().isString(),
  body('leads.*.assignedTo').optional({ checkFalsy: true }).isUUID().withMessage('Invalid assignee ID'),
  body('assigneeIds').optional().isArray(),
  body('assigneeIds.*').optional().isUUID().withMessage('Invalid assignee ID'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('dueDate').optional({ checkFalsy: true }).isISO8601(),
];

export const userUpdateValidation = [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('company').optional().isString(),
  body('department').optional().isIn(DEPARTMENT_OPTIONS).withMessage('Select a valid department'),
  body('role').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'CONTRIBUTOR', 'VIEWER', 'SUPPORT']),
  body('isActive').optional().isBoolean().withMessage('Invalid employee status'),
];

export const supportTicketCreateValidation = [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
];

export const supportTicketReplyValidation = [
  body('message').trim().notEmpty().withMessage('Message is required'),
];

export const supportTicketUpdateValidation = [
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).withMessage('Invalid support status'),
  body('assignedToId').optional({ checkFalsy: true }).isUUID().withMessage('Invalid support assignee'),
];

export const onlineLeadCreateValidation = [
  body('company').trim().notEmpty().withMessage('Company is required'),
  body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2 }).withMessage('Name is too short'),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('project').optional({ checkFalsy: true }).isString(),
  body('message').optional({ checkFalsy: true }).isString(),
  body('source').optional({ checkFalsy: true }).isString(),
];

export const onlineLeadAssignValidation = [
  body('assignedTo').isUUID().withMessage('Select a valid contributor'),
];

export const passwordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

export const idParamValidation = [
  param('id').isUUID().withMessage('Invalid ID format'),
];

export const taskQueryValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'dueDate', 'status', 'priority', 'title']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('status').optional().isIn(['PROCESSED', 'REJECTED', 'ON_HOLD']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  query('company').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
];
