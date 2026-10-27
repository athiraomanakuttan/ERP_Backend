import { Request, Response } from 'express';
import { clientCompanyService } from '../services/clientCompany.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const company = await clientCompanyService.create(req.body, req.user!.id);
  sendSuccess(res, { message: 'Client company created successfully', data: company }, 201);
});
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, status } = req.query as Record<string, string | undefined>;
  const result = await clientCompanyService.list(
    { search, status },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendSuccess(res, { message: 'Client companies retrieved', data: result.items, meta: result });
});
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const company = await clientCompanyService.getById(req.params.id);
  sendSuccess(res, { message: 'Client company retrieved', data: company });
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  const company = await clientCompanyService.update(req.params.id, req.body);
  sendSuccess(res, { message: 'Client company updated successfully', data: company });
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await clientCompanyService.remove(req.params.id);
  sendSuccess(res, { message: 'Client company removed successfully' });
});
