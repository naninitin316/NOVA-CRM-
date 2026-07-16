import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/errorHandler';
import { hasPermission, Resource, Action } from '../utils/permissions';
import prisma from '../config/database';

/** Verify JWT and attach user to request */
export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    void prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        isActive: true,
        company: true,
        department: true,
      },
    })
      .then(async (currentUser) => {
        if (!currentUser || !currentUser.isActive) {
          throw new AppError('Account is disabled.', 403);
        }

        if (currentUser.role !== Role.SUPER_ADMIN && currentUser.company) {
          const company = await prisma.company.findUnique({
            where: { name: currentUser.company },
            select: { isActive: true },
          });

          if (company && !company.isActive) {
            throw new AppError('Company account is disabled.', 403);
          }
        }

        req.user = currentUser;
        next();
      })
      .catch((error) => {
        if (error instanceof AppError) {
          next(error);
          return;
        }
        next(new AppError('Invalid or expired token.', 401));
      });
  } catch {
    next(new AppError('Invalid or expired token.', 401));
  }
};

/** Restrict access to specific roles */
export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to access this resource.', 403));
    }
    next();
  };
};

/** Check granular permission for a resource/action */
export const checkPermission = (resource: Resource, action: Action) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !hasPermission(req.user.role, resource, action)) {
      return next(new AppError(`Permission denied: cannot ${action} ${resource}.`, 403));
    }
    next();
  };
};
