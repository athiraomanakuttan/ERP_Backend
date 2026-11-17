import { Request, Response } from 'express';
import { branchService } from '../services/branch.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const branch = await branchService.create(req.body);
  sendSuccess(res, { message: 'Branch created successfully', data: branch }, 201);
});
export const list = asyncHandler(async (_req: Request, res: Response) => {
  const branches = await branchService.list();
  sendSuccess(res, { message: 'Branches retrieved', data: branches });
});
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const branch = await branchService.getById(req.params.id);
  sendSuccess(res, { message: 'Branch retrieved', data: branch });
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  const branch = await branchService.update(req.params.id, req.body);
  sendSuccess(res, { message: 'Branch updated successfully', data: branch });
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await branchService.remove(req.params.id);
  sendSuccess(res, { message: 'Branch removed successfully' });
});
