import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { workTimeService } from '../services/workTime.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, employee, task, project, from, to, entryType, running } = req.query as Record<string, string | undefined>;
  const result = await workTimeService.list(
    req.user!,
    {
      employee,
      task,
      project,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      entryType: entryType === 'manual' || entryType === 'automatic' ? entryType : undefined,
      running: running === 'true' ? true : running === 'false' ? false : undefined,
    },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendSuccess(res, { message: 'Work sessions retrieved', data: result.items, meta: result });
});


export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, task, from, to, entryType, running } = req.query as Record<string, string | undefined>;
  const result = await workTimeService.listForEmployee(
    req.user!.id,
    {
      task,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      entryType: entryType === 'manual' || entryType === 'automatic' ? entryType : undefined,
      running: running === 'true' ? true : running === 'false' ? false : undefined,
    },
    { page: page ? Number(page) : 1, limit: limit ? Math.min(Number(limit), 50) : 10 }
  );
  sendSuccess(res, { message: 'Your work sessions retrieved', data: result.items, meta: result });
});

export const createManual = asyncHandler(async (req: Request, res: Response) => {
  const session = await workTimeService.createManual(req.body, req.user!.id);
  sendSuccess(res, { message: 'Manual work session added successfully', data: session }, 201);
});

export const createSelfManual = asyncHandler(async (req: Request, res: Response) => {
  const session = await workTimeService.createManualForSelf(req.body, req.user!.id);
  sendSuccess(res, { message: 'Manual task time added successfully', data: session }, 201);
});
