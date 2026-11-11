import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { serviceCategoryService } from '../services/serviceCategory.service';
import { sendSuccess } from '../utils/apiResponse';

export const list = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Categories retrieved', data: await serviceCategoryService.list(req.user!.id) }));
export const create = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Category created', data: await serviceCategoryService.create(req.body.name, req.user!.id) }, 201));
export const update = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Category updated', data: await serviceCategoryService.update(req.params.id, req.body.name) }));
export const remove = asyncHandler(async (req: Request, res: Response) => { await serviceCategoryService.remove(req.params.id); sendSuccess(res, { message: 'Category deleted' }); });
