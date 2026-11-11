import { Request, Response } from 'express';
import { attendanceService } from '../services/attendance.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const session = await attendanceService.checkIn(req.user!.id);
  sendSuccess(res, { message: 'Checked in successfully', data: session }, 201);
});
export const checkOut = asyncHandler(async (req: Request, res: Response) => {
  const session = await attendanceService.checkOut(req.user!.id);
  sendSuccess(res, { message: 'Checked out successfully', data: session });
});
export const startBreak = asyncHandler(async (req: Request, res: Response) => {
  const session = await attendanceService.startBreak(req.user!.id);
  sendSuccess(res, { message: 'Break started', data: session });
});
export const endBreak = asyncHandler(async (req: Request, res: Response) => {
  const session = await attendanceService.endBreak(req.user!.id);
  sendSuccess(res, { message: 'Break ended', data: session });
});
export const myToday = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await attendanceService.myToday(req.user!.id);
  sendSuccess(res, { message: "Today's attendance retrieved", data: sessions });
});
export const history = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from: string; to: string };
  const sessions = req.params.employeeId
    ? await attendanceService.scopedHistory(req.user!, req.params.employeeId, from, to)
    : await attendanceService.history(req.user!.id, from, to);
  sendSuccess(res, { message: 'Attendance history retrieved', data: sessions });
});
export const teamEmployees = asyncHandler(async (req: Request, res: Response) => {
  const employees = await attendanceService.teamEmployeeOptions(req.user!);
  sendSuccess(res, { message: 'Attendance employee options retrieved', data: employees });
});

export const teamHistory = asyncHandler(async (req: Request, res: Response) => {
  const { from, to, employee } = req.query as { from: string; to: string; employee?: string };
  const sessions = await attendanceService.teamHistory(req.user!, from, to, employee);
  sendSuccess(res, { message: 'Team attendance retrieved', data: sessions });
});
export const correct = asyncHandler(async (req: Request, res: Response) => {
  const session = await attendanceService.correct(req.params.id, req.body, req.user!);
  sendSuccess(res, { message: 'Attendance record corrected', data: session });
});
