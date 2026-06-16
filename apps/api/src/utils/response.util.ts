import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '../types/index.js';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, message?: string): void {
  const body: ApiResponse<T> = { success: true, data, message };
  res.status(statusCode).json(body);
}

export function sendError(res: Response, message: string, statusCode = 400, errors?: Record<string, string[]>): void {
  const body: ApiResponse = { success: false, message, errors };
  res.status(statusCode).json(body);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
): void {
  const body: PaginatedResponse<T> = {
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
  res.status(200).json(body);
}
