import { Router } from 'express';
import { authenticate, authorize, checkPermission } from '../middleware/auth';
import { validate, loginValidation, registerValidation, passwordValidation } from '../middleware/validation';
import { login, register, getProfile, changePassword } from '../controllers/auth.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post('/login', loginValidation, validate, login);
router.post('/register', registerValidation, validate, register);
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, passwordValidation, validate, changePassword);

export default router;
