import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { sendError } from '../utils/response.util.js';

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      errors[key] = [...(errors[key] ?? []), issue.message];
    }
    sendError(res, 'Validation failed', 422, errors);
    return;
  }

  console.error('[UnhandledError]', err);

  const message = config.isDev() ? err.message : 'Internal server error';
  sendError(res, message, 500);
}
