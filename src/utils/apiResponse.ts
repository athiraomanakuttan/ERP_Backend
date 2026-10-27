import { Response } from 'express';

interface SuccessPayload<T> {
  message: string;
  data?: T;
  meta?: unknown;
}

interface ErrorPayload {
  message: string;
  errors?: unknown[];
}

export function sendSuccess<T>(
  res: Response,
  { message, data, meta }: SuccessPayload<T>,
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
    ...(meta ? { meta } : {}),
  });
}

export function sendError(res: Response, { message, errors }: ErrorPayload, statusCode = 400): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors ?? [],
  });
}
