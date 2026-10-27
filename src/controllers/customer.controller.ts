import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { customerService } from '../services/customer.service';
import { sendSuccess } from '../utils/apiResponse';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await customerService.create(req.body, req.user!.id);
  sendSuccess(res, { message: 'Customer created successfully', data }, 201);
});
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, type, currency } = req.query as Record<string,string|undefined>;
  const result = await customerService.list({ search, type, currency }, Number(page || 1), Number(limit || 20));
  sendSuccess(res, { message: 'Customers retrieved', data: result.items, meta: result });
});
export const getById = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Customer retrieved', data: await customerService.getById(req.params.id) }));
export const update = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Customer updated successfully', data: await customerService.update(req.params.id, req.body) }));
export const remove = asyncHandler(async (req: Request, res: Response) => { await customerService.remove(req.params.id); sendSuccess(res, { message: 'Customer deleted successfully' }); });
