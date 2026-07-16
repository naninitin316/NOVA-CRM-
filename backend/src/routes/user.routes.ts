import { Router } from 'express';
import { authenticate, authorize, checkPermission } from '../middleware/auth';
import { validate, registerValidation, userUpdateValidation, idParamValidation } from '../middleware/validation';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
} from '../controllers/user.controller';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('users', 'read'), getUsers);
router.put('/profile', userUpdateValidation, validate, updateProfile);
router.get('/:id', idParamValidation, validate, checkPermission('users', 'read'), getUserById);
router.post('/', authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.MEMBER), registerValidation, validate, createUser);
router.put('/:id', idParamValidation, userUpdateValidation, validate, authorize(Role.SUPER_ADMIN, Role.ADMIN), updateUser);
router.delete('/:id', idParamValidation, validate, authorize(Role.SUPER_ADMIN, Role.ADMIN), deleteUser);

export default router;
