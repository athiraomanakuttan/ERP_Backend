import { Request, Response } from 'express';
import { roleService, permissionService } from '../services/role.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.create(req.body);
  sendSuccess(res, { message: 'Role created successfully', data: role }, 201);
});

export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await roleService.list();
  sendSuccess(res, { message: 'Roles retrieved', data: roles });
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.getById(req.params.id);
  sendSuccess(res, { message: 'Role retrieved', data: role });
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.update(req.params.id, req.body);
  sendSuccess(res, { message: 'Role updated successfully', data: role });
});

export const removeRole = asyncHandler(async (req: Request, res: Response) => {
  await roleService.remove(req.params.id);
  sendSuccess(res, { message: 'Role removed successfully' });
});

export const createPermission = asyncHandler(async (req: Request, res: Response) => {
  const permission = await permissionService.create(req.body);
  sendSuccess(res, { message: 'Permission created successfully', data: permission }, 201);
});

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await permissionService.list();
  sendSuccess(res, { message: 'Permissions retrieved', data: permissions });
});
