import { Router } from 'express';
import { authenticate, authorize, checkPermission } from '../middleware/auth';
import { validate, companyCreateValidation } from '../middleware/validation';
import { body, param } from 'express-validator';
import { createCompany, deleteCompany, getCompanies, getCompanyByName, updateCompanyStatus } from '../controllers/company.controller';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('users', 'read'), getCompanies);
router.get('/:name', param('name').notEmpty(), validate, getCompanyByName);
router.post('/', authorize(Role.SUPER_ADMIN), companyCreateValidation, validate, createCompany);
router.patch(
  '/:name/status',
  authorize(Role.SUPER_ADMIN),
  param('name').notEmpty(),
  body('isActive').custom((value) => typeof value === 'boolean').withMessage('Company status is required'),
  validate,
  updateCompanyStatus
);
router.delete('/:name', authorize(Role.SUPER_ADMIN), param('name').notEmpty(), validate, deleteCompany);

export default router;
