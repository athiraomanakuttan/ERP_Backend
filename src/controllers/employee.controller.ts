import { Request, Response } from 'express';
import { employeeService } from '../services/employee.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';
import { AppError } from '../utils/AppError';

function currentActor(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return {
    id: req.user.id,
    isAdmin: req.user.isAdmin,
    permissionKeys: req.user.permissionKeys,
  };
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.create(req.body);
  sendSuccess(res, { message: 'Employee created successfully', data: employee }, 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, branch, role, status } = req.query as Record<string, string | undefined>;
  const result = await employeeService.list(
    currentActor(req),
    { search, branch, role, status },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendSuccess(res, { message: 'Employees retrieved', data: result.items, meta: result });
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query as { q?: string };
  const results = await employeeService.search(currentActor(req), q ?? '');
  sendSuccess(res, { message: 'Employees found', data: results });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.getById(currentActor(req), req.params.id);
  sendSuccess(res, { message: 'Employee retrieved', data: employee });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.update(currentActor(req), req.params.id, req.body);
  sendSuccess(res, { message: 'Employee updated successfully', data: employee });
});

export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: 'active' | 'inactive' };
  const employee = await employeeService.setStatus(currentActor(req), req.params.id, status);
  sendSuccess(res, { message: `Employee ${status === 'active' ? 'activated' : 'deactivated'}`, data: employee });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await employeeService.softDelete(currentActor(req), req.params.id);
  sendSuccess(res, { message: 'Employee removed successfully' });
});
