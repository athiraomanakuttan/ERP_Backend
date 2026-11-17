import { Request, Response } from 'express';
import { workSummaryService } from '../services/workSummary.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const summarize = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, month, from, to } = req.query as Record<string, string | undefined>;
  const result = await workSummaryService.summarize(employeeId!, { month, from, to });
  sendSuccess(res, { message: 'Work summary retrieved', data: result });
});
