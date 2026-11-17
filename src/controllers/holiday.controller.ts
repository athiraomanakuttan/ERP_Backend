import { Request, Response } from 'express';
import { holidayService } from '../services/holiday.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const holiday = await holidayService.create(req.body);
  sendSuccess(res, { message: 'Holiday created successfully', data: holiday }, 201);
});
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, branch, from, to } = req.query as Record<string, string | undefined>;
  const result = await holidayService.list(
    {
      branch,
      from: from ? new Date(`${from}T00:00:00.000`) : undefined,
      to: to ? new Date(`${to}T23:59:59.999`) : undefined,
    },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendSuccess(res, { message: 'Holidays retrieved', data: result.items, meta: result });
});
export const listByBranch = asyncHandler(async (req: Request, res: Response) => {
  const holidays = await holidayService.listByBranch(req.params.branchId);
  sendSuccess(res, { message: 'Holidays retrieved', data: holidays });
});
export const upcoming = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const holidays = await holidayService.upcoming(limit);
  sendSuccess(res, { message: 'Upcoming holidays retrieved', data: holidays });
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  const holiday = await holidayService.update(req.params.id, req.body);
  sendSuccess(res, { message: 'Holiday updated successfully', data: holiday });
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await holidayService.remove(req.params.id);
  sendSuccess(res, { message: 'Holiday removed successfully' });
});
