import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * Usage: router.post('/', authenticate, requirePermission('projects:create'), controller.create)
 * Admin always retains unrestricted access (spec section 1 & 3) and bypasses this check.
 */
export function requirePermission(...anyOfKeys: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (req.user.isAdmin) {
      next();
      return;
    }
    const hasPermission = anyOfKeys.some((key) => req.user!.permissionKeys.includes(key));
    if (!hasPermission) {
      next(AppError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

/** Restricts a route to Admin only (e.g. creating branches, holidays, announcements). */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    next(AppError.forbidden('This action is restricted to Admin'));
    return;
  }
  next();
}


/** Require a permission only when one of the protected body fields is present. */
export function requireFieldPermission(fields: string[], permissionKey: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());
    if (req.user.isAdmin) return next();
    const touchesProtectedField = fields.some((field) => Object.prototype.hasOwnProperty.call(req.body ?? {}, field));
    if (!touchesProtectedField) return next();
    if (!req.user.permissionKeys.includes(permissionKey)) {
      return next(AppError.forbidden(`You do not have permission to modify ${fields.join(', ')}`));
    }
    next();
  };
}


export function requireAllPermissions(...keys: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());
    if (req.user.isAdmin) return next();
    const hasAll = keys.every((key) => req.user!.permissionKeys.includes(key));
    if (!hasAll) return next(AppError.forbidden('You do not have permission to view all work time'));
    next();
  };
}
