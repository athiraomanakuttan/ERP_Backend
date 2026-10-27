import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const get = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsService.get();
  sendSuccess(res, { message: 'Settings retrieved', data: { _id: settings._id, companyName: settings.companyName, logoDataUrl: settings.logoDataUrl, themeColor: settings.themeColor } });
});

export const getAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsService.get();
  sendSuccess(res, { message: 'Admin settings retrieved', data: settings });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.update(req.body, req.user!.id);
  sendSuccess(res, { message: 'Settings updated successfully', data: settings });
});
