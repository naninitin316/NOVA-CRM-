import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { Role } from '@prisma/client';
import { generateToken } from '../utils/jwt';
import { AppError } from '../utils/errorHandler';
import { mailService } from './mail.service';

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('Invalid email or password.', 401);
    if (!user.isActive) throw new AppError('Account is disabled.', 403);

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new AppError('Invalid email or password.', 401);

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: Role;
    company?: string;
    department?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered.', 409);

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || Role.CONTRIBUTOR,
        company: data.company,
        department: data.department,
      },
    });

    void mailService.sendWelcomeEmail({
      to: user.email,
      name: user.name,
      email: user.email,
      password: data.password,
      role: user.role,
      company: user.company,
      department: user.department,
    }).catch((error) => console.error('[Mail] Failed to send welcome email after register', error));

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        company: true,
        department: true,
        phone: true,
        profileImage: true,
        createdAt: true,
      },
    });
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found.', 404);

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new AppError('Current password is incorrect.', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully.' };
  }
}

export const authService = new AuthService();
