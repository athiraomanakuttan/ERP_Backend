import { AttendanceSession, IAttendanceSession } from '../models/Attendance.model';

export class AttendanceRepository {
  async findOpenSessionForEmployee(employeeId: string, workDate?: string): Promise<IAttendanceSession | null> {
    const filter: Record<string, unknown> = { employee: employeeId, checkOutTime: null };
    if (workDate) filter.workDate = workDate;
    return AttendanceSession.findOne(filter).sort({ checkInTime: -1 });
  }

  async findByEmployeeAndDate(employeeId: string, workDate: string): Promise<IAttendanceSession[]> {
    return AttendanceSession.find({ employee: employeeId, workDate }).sort('checkInTime');
  }

  async findByEmployeeRange(employeeId: string, from: string, to: string): Promise<IAttendanceSession[]> {
    return AttendanceSession.find({ employee: employeeId, workDate: { $gte: from, $lte: to } }).sort('workDate');
  }

  async findByEmployeesRange(employeeIds: string[], from: string, to: string): Promise<IAttendanceSession[]> {
    if (employeeIds.length === 0) return [];
    return AttendanceSession.find({ employee: { $in: employeeIds }, workDate: { $gte: from, $lte: to } })
      .sort({ workDate: -1, checkInTime: -1 })
      .populate({ path: 'employee', select: 'firstName lastName email employeeCode' });
  }

  async checkIn(employeeId: string, workDate: string): Promise<IAttendanceSession> {
    return AttendanceSession.create({ employee: employeeId, workDate, checkInTime: new Date(), breaks: [] });
  }

  async checkOut(sessionId: string): Promise<IAttendanceSession | null> {
    return AttendanceSession.findByIdAndUpdate(sessionId, { checkOutTime: new Date() }, { new: true });
  }

  async startBreak(sessionId: string): Promise<IAttendanceSession | null> {
    return AttendanceSession.findByIdAndUpdate(
      sessionId,
      { $push: { breaks: { breakStart: new Date(), breakEnd: null } } },
      { new: true }
    );
  }

  async endBreak(sessionId: string): Promise<IAttendanceSession | null> {
    const session = await AttendanceSession.findById(sessionId);
    if (!session) return null;
    const openBreak = session.breaks.find((b) => !b.breakEnd);
    if (openBreak) {
      openBreak.breakEnd = new Date();
      await session.save();
    }
    return session;
  }
}

export const attendanceRepository = new AttendanceRepository();
