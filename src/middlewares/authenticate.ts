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
    if (!employee || employee.isDeleted) {
      throw AppError.unauthorized('Account no longer exists');
    }
    // Deactivation/password changes invalidate every existing access/refresh token.
    if (employee.status !== 'active') {
      throw AppError.unauthorized('This account has been deactivated');
    }
    if ((payload.sessionVersion ?? 0) !== (employee.sessionVersion ?? 0)) {
      throw AppError.unauthorized('Your session is no longer valid. Please sign in again.');
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
      profilePhotoUrl: employee.profilePhotoUrl,
    };

    next();
  } catch (err) {
    next(err instanceof AppError ? err : AppError.unauthorized('Invalid or expired token'));
  }
}
