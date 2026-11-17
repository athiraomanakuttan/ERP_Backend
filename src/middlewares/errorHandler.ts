import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, { message: `Route not found: ${req.method} ${req.originalUrl}` }, 404);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, { message: err.message, errors: err.errors }, err.statusCode);
    return;
  }

  if (err.name === 'ValidationError') {
    sendError(res, { message: 'Validation failed', errors: [err.message] }, 422);
    return;
  }

  if ((err as { code?: number }).code === 11000) {
    const duplicate = err as { code?: number; keyPattern?: Record<string, number>; keyValue?: Record<string, unknown> };
    const field = duplicate.keyPattern ? Object.keys(duplicate.keyPattern)[0] : undefined;
    const value = field ? duplicate.keyValue?.[field] : undefined;
    const label = field === 'employeeCode' ? 'Employee code' : field === 'email' ? 'Email' : field;
    const message = label
      ? `${label} ${value !== undefined && value !== '' ? `\"${String(value)}\" ` : ''}already exists`
      : 'Duplicate value violates a unique constraint';
    sendError(res, { message }, 409);
    return;
  }

  logger.error('Unhandled error', err);
  sendError(res, { message: 'Internal server error' }, 500);
}
