import { attendanceRepository } from '../repositories/AttendanceRepository';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { taskService } from './task.service';
import { AppError } from '../utils/AppError';
import { getEmployeeVisibilityScope } from '../utils/employeeAccess';
import { AttendanceSession } from '../models/Attendance.model';

function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

interface AttendanceActor {
  id: string;
  isAdmin: boolean;
  permissionKeys: string[];
}

export class AttendanceService {
  private async currentWorkDate(employeeId: string): Promise<string> {
    const employee = await employeeRepository.findByIdPopulated(employeeId);
    if (!employee) throw AppError.notFound('Employee not found');
    const branch = employee.branch as unknown as { timezone?: string };
    const timezone = branch?.timezone || 'UTC';
    return dateInTimeZone(new Date(), timezone);
  }

  async checkIn(employeeId: string) {
    const workDate = await this.currentWorkDate(employeeId);
    const open = await attendanceRepository.findOpenSessionForEmployee(employeeId, workDate);
    if (open) throw AppError.conflict('You are already checked in today');
    return attendanceRepository.checkIn(employeeId, workDate);
  }

  async checkOut(employeeId: string) {
    const workDate = await this.currentWorkDate(employeeId);
    const open = await attendanceRepository.findOpenSessionForEmployee(employeeId, workDate);
    if (!open) throw AppError.badRequest('You are not currently checked in today');
    await taskService.pauseTimerIfRunning(employeeId, 'checkout');
    return attendanceRepository.checkOut(open._id.toString());
  }

  async startBreak(employeeId: string) {
    const workDate = await this.currentWorkDate(employeeId);
    const open = await attendanceRepository.findOpenSessionForEmployee(employeeId, workDate);
    if (!open) throw AppError.badRequest('You must be checked in today to start a break');
    if (open.breaks.some((entry) => !entry.breakEnd)) throw AppError.conflict('You are already on a break');
    await taskService.pauseTimerIfRunning(employeeId, 'break_start');
    return attendanceRepository.startBreak(open._id.toString());
  }

  async endBreak(employeeId: string) {
    const workDate = await this.currentWorkDate(employeeId);
    const open = await attendanceRepository.findOpenSessionForEmployee(employeeId, workDate);
    if (!open) throw AppError.badRequest('You must be checked in today to end a break');
    if (!open.breaks.some((entry) => !entry.breakEnd)) throw AppError.badRequest('There is no active break to end');
    return attendanceRepository.endBreak(open._id.toString());
  }

  async myToday(employeeId: string) {
    const workDate = await this.currentWorkDate(employeeId);
    return attendanceRepository.findByEmployeeAndDate(employeeId, workDate);
  }

  async history(employeeId: string, from: string, to: string) {
    return attendanceRepository.findByEmployeeRange(employeeId, from, to);
  }

  private async assertEmployeeInAttendanceScope(actor: AttendanceActor, employeeId: string) {
    if (actor.isAdmin) return;
    if (!actor.permissionKeys.includes('attendance:view') && !actor.permissionKeys.includes('attendance:edit')) {
      throw AppError.forbidden('You do not have permission to access employee attendance');
    }
    const scope = getEmployeeVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('Employee visibility is required to access team attendance');
    const employee = await employeeRepository.findByIdPopulatedScoped(employeeId, actor.id, scope);
    if (!employee) throw AppError.forbidden('This employee is outside your allowed employee scope');
  }

  async scopedHistory(actor: AttendanceActor, employeeId: string, from: string, to: string) {
    await this.assertEmployeeInAttendanceScope(actor, employeeId);
    return attendanceRepository.findByEmployeeRange(employeeId, from, to);
  }

  async teamEmployeeOptions(actor: AttendanceActor) {
    const scope = getEmployeeVisibilityScope(actor);
    if (!actor.isAdmin && (!actor.permissionKeys.includes('attendance:view') || scope === 'none')) {
      throw AppError.forbidden('Employee visibility is required to access team attendance');
    }
    return employeeRepository.findActiveRefsScoped(actor.id, scope);
  }

  async teamHistory(actor: AttendanceActor, from: string, to: string, employeeId?: string) {
    if (employeeId) return this.scopedHistory(actor, employeeId, from, to);
    const scope = getEmployeeVisibilityScope(actor);
    if (!actor.isAdmin && scope === 'none') throw AppError.forbidden('Employee visibility is required to access team attendance');
    const employeeIds = await employeeRepository.findIdsScoped(actor.id, scope);
    return attendanceRepository.findByEmployeesRange(employeeIds, from, to);
  }

  async correct(sessionId: string, correction: { checkInTime?: Date; checkOutTime?: Date; correctionReason: string }, actor: AttendanceActor) {
    const session = await AttendanceSession.findById(sessionId);
    if (!session) throw AppError.notFound('Attendance record not found');
    await this.assertEmployeeInAttendanceScope(actor, session.employee.toString());
    if (correction.checkInTime) session.checkInTime = correction.checkInTime;
    if (correction.checkOutTime) session.checkOutTime = correction.checkOutTime;
    session.correctionReason = correction.correctionReason;
    session.correctedBy = actor.id as never;
    await session.save();
    return session;
  }
}
export const attendanceService = new AttendanceService();
