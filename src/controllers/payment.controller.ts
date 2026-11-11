import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { paymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/apiResponse';

export const create = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Payment recorded successfully', data: await paymentService.create(req.body, req.user!.id) }, 201));
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, invoice, customer, search, paymentMode, fromDate, toDate } = req.query as Record<string,string|undefined>;
  const result = await paymentService.list({ invoice, customer, search, paymentMode: paymentMode as never, fromDate, toDate }, Number(page || 1), Number(limit || 20));
  sendSuccess(res, { message: 'Payments retrieved', data: result.items, meta: result });
});
