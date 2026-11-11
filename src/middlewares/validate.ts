import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';
import { sendError } from '../utils/apiResponse';

interface Schemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/** Validates req.body / req.params / req.query against Zod schemas (spec section 26). */
export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      next();
    } catch (err: unknown) {
      const zodErr = err as { errors?: unknown[] };
      sendError(res, { message: 'Validation failed', errors: zodErr.errors ?? [String(err)] }, 422);
    }
  };
}
