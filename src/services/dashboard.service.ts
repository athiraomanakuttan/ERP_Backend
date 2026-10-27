import { Employee } from '../models/Employee.model';
import { Project } from '../models/Project.model';
import { LeaveRequest } from '../models/Leave.model';
import { AttendanceSession } from '../models/Attendance.model';
import { holidayRepository } from '../repositories/HolidayRepository';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Employee birthdays/anniversaries in the next `days` days, generated from employee data (spec section 14). */
async function upcomingEvents(days = 30) {
  const employees = await Employee.find({ isDeleted: { $ne: true }, status: 'active' }).select(
    'firstName lastName dateOfBirth joiningDate'
  );
  const now = new Date();
  const withinWindow = (date: Date): boolean => {
    const next = new Date(now.getFullYear(), date.getMonth(), date.getDate());
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      next.setFullYear(now.getFullYear() + 1);
    }
    const diffDays = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  };

  const birthdays = employees
    .filter((e) => withinWindow(e.dateOfBirth))
    .map((e) => ({ type: 'birthday', employee: `${e.firstName} ${e.lastName ?? ''}`.trim(), date: e.dateOfBirth }));

  const anniversaries = employees
    .filter((e) => withinWindow(e.joiningDate))
    .map((e) => ({ type: 'work_anniversary', employee: `${e.firstName} ${e.lastName ?? ''}`.trim(), date: e.joiningDate }));

  return [...birthdays, ...anniversaries];
}

export class DashboardService {
  async adminDashboard() {
    const today = todayStr();
    const [totalEmployees, onLeaveToday, presentToday, pendingLeaves, activeProjects, upcomingHolidays, events] =
      await Promise.all([
        Employee.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
        LeaveRequest.countDocuments({
          status: 'approved',
          isDeleted: { $ne: true },
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        }),
        AttendanceSession.distinct('employee', { workDate: today }).then((ids) => ids.length),
        LeaveRequest.countDocuments({ status: 'pending', isDeleted: { $ne: true } }),
        Project.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
        holidayRepository.findUpcoming(5),
        upcomingEvents(30),
      ]);

    return {
      totalEmployees,
      employeesOnLeaveToday: onLeaveToday,
      presentEmployees: presentToday,
      pendingLeaveRequests: pendingLeaves,
      activeProjects,
      upcomingHolidays,
      upcomingEvents: events,
    };
  }

  /** Employee dashboard shows only what's relevant to them - no invented metrics (spec section 13). */
  async employeeDashboard(employeeId: string) {
    const today = todayStr();
    const [todaysAttendance, myPendingLeaves, myTasks] = await Promise.all([
      AttendanceSession.find({ employee: employeeId, workDate: today }),
      LeaveRequest.countDocuments({ employee: employeeId, status: 'pending', isDeleted: { $ne: true } }),
      (await import('../models/Task.model')).Task.countDocuments({ assignees: employeeId, isDeleted: { $ne: true } }),
    ]);
    return {
      todaysAttendance,
      myPendingLeaveRequests: myPendingLeaves,
      myTaskCount: myTasks,
    };
  }
}
export const dashboardService = new DashboardService();
