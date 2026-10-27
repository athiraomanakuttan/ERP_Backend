import { Request, Response } from 'express';
import { reportService } from '../services/report.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

function currentActor(req: Request) {
  return { id: req.user!.id, isAdmin: req.user!.isAdmin, permissionKeys: req.user!.permissionKeys };
}

function pagination(req: Request) {
  const { page, limit } = req.query as Record<string, string | undefined>;
  return { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined };
}


export const analytics = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  const today = new Date();
  const defaultTo = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultFrom = `${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-${String(first.getDate()).padStart(2,'0')}`;
  const result = await reportService.analytics(currentActor(req), { from: from || defaultFrom, to: to || defaultTo });
  sendSuccess(res, { message: 'Analytics report retrieved', data: result });
});

export const employees = asyncHandler(async (req: Request, res: Response) => {
  const { search, branch, status } = req.query as Record<string, string | undefined>;
  const result = await reportService.employees({ search, branch, status }, pagination(req));
  sendSuccess(res, { message: 'Employee report retrieved', data: result.items, meta: result });
});

export const attendanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const { employee, from, to } = req.query as Record<string, string | undefined>;
  const today = new Date();
  const defaultTo = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultFrom = `${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-${String(first.getDate()).padStart(2,'0')}`;
  const result = await reportService.attendanceSummary(currentActor(req), { employee, from: from || defaultFrom, to: to || defaultTo }, pagination(req));
  sendSuccess(res, { message: 'Attendance summary report retrieved', data: result.items, meta: result });
});

export const attendance = asyncHandler(async (req: Request, res: Response) => {
  const { employee, from, to } = req.query as Record<string, string | undefined>;
  const result = await reportService.attendance({ employee, from, to }, pagination(req));
  sendSuccess(res, { message: 'Attendance report retrieved', data: result.items, meta: result });
});
export const leaves = asyncHandler(async (req: Request, res: Response) => {
  const { employee, status } = req.query as Record<string, string | undefined>;
  const result = await reportService.leaves({ employee, status }, pagination(req));
  sendSuccess(res, { message: 'Leave report retrieved', data: result.items, meta: result });
});
export const projects = asyncHandler(async (req: Request, res: Response) => {
  const { search, status } = req.query as Record<string, string | undefined>;
  const result = await reportService.projects({ search, status }, pagination(req));
  sendSuccess(res, { message: 'Project report retrieved', data: result.items, meta: result });
});
export const tasks = asyncHandler(async (req: Request, res: Response) => {
  const { search, status, project } = req.query as Record<string, string | undefined>;
  const result = await reportService.tasks({ search, status, project }, pagination(req));
  sendSuccess(res, { message: 'Task report retrieved', data: result.items, meta: result });
});
export const branches = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query as Record<string, string | undefined>;
  const result = await reportService.branches({ search }, pagination(req));
  sendSuccess(res, { message: 'Branch report retrieved', data: result.items, meta: result });
});
export const clientCompanies = asyncHandler(async (req: Request, res: Response) => {
  const { search, status } = req.query as Record<string, string | undefined>;
  const result = await reportService.clientCompanies({ search, status }, pagination(req));
  sendSuccess(res, { message: 'Client company report retrieved', data: result.items, meta: result });
});
