import { Request, Response } from 'express';
import { leaveTypeService, leaveRequestService } from '../services/leave.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

function parseDate(value: unknown, endOfDay = false): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export const createType = asyncHandler(async (req: Request, res: Response) => {
  const type = await leaveTypeService.create(req.body);
  sendSuccess(res, { message: 'Leave type created successfully', data: type }, 201);
});
export const listTypes = asyncHandler(async (_req: Request, res: Response) => {
  const types = await leaveTypeService.list();
  sendSuccess(res, { message: 'Leave types retrieved', data: types });
});
export const updateType = asyncHandler(async (req: Request, res: Response) => {
  const type = await leaveTypeService.update(req.params.id, req.body);
  sendSuccess(res, { message: 'Leave type updated successfully', data: type });
});
export const removeType = asyncHandler(async (req: Request, res: Response) => {
  await leaveTypeService.remove(req.params.id);
  sendSuccess(res, { message: 'Leave type removed successfully' });
});


export const myBalance = asyncHandler(async (req: Request, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const balances = await leaveRequestService.balances(req.user!, req.user!.id, year);
  sendSuccess(res, { message: 'Leave balance retrieved', data: balances });
});
export const employeeBalance = asyncHandler(async (req: Request, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const balances = await leaveRequestService.balances(req.user!, req.params.employeeId, year);
  sendSuccess(res, { message: 'Employee leave balance retrieved', data: balances });
});

export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await leaveRequestService.create(req.user!.id, req.body);
  sendSuccess(res, { message: 'Leave request submitted', data: request }, 201);
});
export const myRequests = asyncHandler(async (req: Request, res: Response) => {
  const requests = await leaveRequestService.myRequests(
    req.user!.id,
    parseDate(req.query.from),
    parseDate(req.query.to, true)
  );
  sendSuccess(res, { message: 'Your leave requests retrieved', data: requests });
});
export const pending = asyncHandler(async (req: Request, res: Response) => {
  const requests = await leaveRequestService.pendingFor(
    req.user!.id,
    req.user!.isAdmin,
    parseDate(req.query.from),
    parseDate(req.query.to, true)
  );
  sendSuccess(res, { message: 'Pending leave requests retrieved', data: requests });
});
export const reviewed = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status === 'approved' || req.query.status === 'rejected' ? req.query.status : undefined;
  const requests = await leaveRequestService.reviewedFor(
    req.user!,
    parseDate(req.query.from),
    parseDate(req.query.to, true),
    status,
    typeof req.query.employee === 'string' ? req.query.employee : undefined
  );
  sendSuccess(res, { message: 'Reviewed leave requests retrieved', data: requests });
});
export const decide = asyncHandler(async (req: Request, res: Response) => {
  const { decision, decisionNote } = req.body as { decision: 'approve' | 'reject'; decisionNote?: string };
  const request = await leaveRequestService.decide(req.params.id, decision, req.user!, decisionNote);
  sendSuccess(res, { message: `Leave request ${decision === 'approve' ? 'approved' : 'rejected'}`, data: request });
});
export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const request = await leaveRequestService.cancel(req.params.id, req.user!.id);
  sendSuccess(res, { message: 'Leave request cancelled', data: request });
});
