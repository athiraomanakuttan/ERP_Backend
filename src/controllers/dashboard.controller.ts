import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const admin = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.adminDashboard();
  sendSuccess(res, { message: 'Admin dashboard retrieved', data });
});
export const mine = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.employeeDashboard(req.user!.id);
  sendSuccess(res, { message: 'Dashboard retrieved', data });
});
