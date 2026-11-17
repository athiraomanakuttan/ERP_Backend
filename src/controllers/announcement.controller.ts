import { Request, Response } from 'express';
import { announcementService } from '../services/announcement.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const announcement = await announcementService.create(req.body, req.user!.id);
  sendSuccess(res, { message: 'Announcement published successfully', data: announcement }, 201);
});
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string | undefined>;
  const result = await announcementService.list({ page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  sendSuccess(res, { message: 'Announcements retrieved', data: result.items, meta: result });
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await announcementService.remove(req.params.id);
  sendSuccess(res, { message: 'Announcement removed successfully' });
});
