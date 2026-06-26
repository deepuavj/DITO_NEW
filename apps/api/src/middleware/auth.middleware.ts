import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index';
import { verifyAccessToken } from '../utils/jwt.util';
import { AppError } from './error.middleware';
import type { Role } from '@prisma/client';

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Missing or invalid Authorization header', 401));
  }

  const token = header.slice(7);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError('Token invalid or expired', 401));
  }
}

/** Like authenticate but never rejects — attaches user if token is valid, otherwise continues as anonymous. */
export function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = verifyAccessToken(header.slice(7)); } catch { /* ignore */ }
  }
  next();
}

export function authorize(...roles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}
