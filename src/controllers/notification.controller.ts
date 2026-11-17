import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const unreadOnly = req.query.unread === 'true';
  const notifications = await notificationService.list(req.user!.id, unreadOnly);
  sendSuccess(res, { message: 'Notifications retrieved', data: notifications });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markRead(req.params.id, req.user!.id);
  sendSuccess(res, { message: 'Notification marked as read', data: notification });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllRead(req.user!.id);
  sendSuccess(res, { message: 'All notifications marked as read' });
});
