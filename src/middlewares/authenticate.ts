import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { roleRepository } from '../repositories/RoleRepository';
import { IPermission } from '../models/Permission.model';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid Authorization header');
    }
    const token = header.slice('Bearer '.length);
    const payload = verifyAccessToken(token);

    const employee = await employeeRepository.findById(payload.sub);
    if (!employee) {
      throw AppError.unauthorized('Account no longer exists');
    }
    // Deactivated employees are blocked from all authenticated actions (spec section 4 & 19)
    if (employee.status !== 'active') {
      throw AppError.forbidden('This account has been deactivated');
    }

    let permissionKeys: string[] = [];
    if (!employee.isAdmin) {
      const role = await roleRepository.findWithPermissions(employee.role.toString());
      permissionKeys = ((role?.permissions as unknown as IPermission[]) ?? []).map((p) => p.key);
    }

    req.user = {
      id: employee._id.toString(),
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      isAdmin: employee.isAdmin,
      roleId: employee.role.toString(),
      permissionKeys,
    };

    next();
  } catch (err) {
    next(err instanceof AppError ? err : AppError.unauthorized('Invalid or expired token'));
  }
}
