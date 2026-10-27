import { Request, Response } from 'express';
import { taskService } from '../services/task.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.create(req.body, req.user!);
  sendSuccess(res, { message: 'Task created successfully', data: task }, 201);
});
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, project, company, assignee, status, priority, dueFrom, dueTo, search } = req.query as Record<string, string | undefined>;
  const result = await taskService.list(
    req.user!,
    { project, company, assignee, status, priority, dueFrom, dueTo, search },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendSuccess(res, { message: 'Tasks retrieved', data: result.items, meta: result });
});

export const filterOptions = asyncHandler(async (req: Request, res: Response) => {
  const options = await taskService.filterOptions(req.user!);
  sendSuccess(res, { message: 'Task filter options retrieved', data: options });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.getByIdForResponse(req.user!, req.params.id);
  sendSuccess(res, { message: 'Task retrieved', data: task });
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.update(req.user!, req.params.id, req.body);
  sendSuccess(res, { message: 'Task updated successfully', data: task });
});
export const assignEmployee = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.assignEmployee(req.user!, req.params.id, req.body.employeeId);
  sendSuccess(res, { message: 'Employee assigned to task', data: task });
});
export const changeStatus = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.changeStatus(req.user!, req.params.id, req.body.status);
  sendSuccess(res, { message: 'Task status updated', data: task });
});
export const decideApproval = asyncHandler(async (req: Request, res: Response) => {
  const { decision } = req.body as { decision: 'approve' | 'reopen' };
  const task = await taskService.decideApproval(req.user!, req.params.id, decision);
  sendSuccess(res, { message: `Task ${decision === 'approve' ? 'approved' : 'reopened'}`, data: task });
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await taskService.remove(req.user!, req.params.id);
  sendSuccess(res, { message: 'Task removed successfully' });
});

export const startTimer = asyncHandler(async (req: Request, res: Response) => {
  const session = await taskService.startTimer(req.params.id, req.user!.id);
  sendSuccess(res, { message: 'Task timer started', data: session });
});
export const pauseTimer = asyncHandler(async (req: Request, res: Response) => {
  const session = await taskService.pauseTimer(req.user!.id);
  sendSuccess(res, { message: 'Task timer paused', data: session });
});
export const getTotalTime = asyncHandler(async (req: Request, res: Response) => {
  const result = await taskService.getTotalTime(req.user!, req.params.id, req.params.employeeId);
  sendSuccess(res, { message: 'Total time retrieved', data: result });
});
export const getCurrentTimer = asyncHandler(async (req: Request, res: Response) => {
  const result = await taskService.getCurrentTimer(req.user!.id);
  sendSuccess(res, { message: 'Current timer retrieved', data: result });
});
