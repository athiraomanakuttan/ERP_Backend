import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { invoiceFollowUpService } from '../services/invoiceFollowUp.service';
import { sendSuccess } from '../utils/apiResponse';

export const list = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Invoice follow-ups retrieved', data: await invoiceFollowUpService.list(req.params.invoiceId) }));
export const create = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Follow-up added', data: await invoiceFollowUpService.create(req.params.invoiceId, req.body, req.user!.id) }, 201));
export const remove = asyncHandler(async (req: Request, res: Response) => { await invoiceFollowUpService.remove(req.params.id); sendSuccess(res, { message: 'Follow-up deleted' }); });
