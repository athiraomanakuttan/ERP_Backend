import { multiWordSearch } from '../utils/escapeRegex';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { attendanceRepository } from '../repositories/AttendanceRepository';
import { leaveRequestRepository } from '../repositories/LeaveRepository';
import { projectRepository } from '../repositories/ProjectRepository';
import { taskRepository } from '../repositories/TaskRepository';
import { branchRepository } from '../repositories/BranchRepository';
import { clientCompanyRepository } from '../repositories/ClientCompanyRepository';
import { PaginationParams } from '../repositories/BaseRepository';
import { AttendanceSession } from '../models/Attendance.model';
import { LeaveRequest } from '../models/Leave.model';
import { getEmployeeVisibilityScope, EmployeeAccessContext } from '../utils/employeeAccess';
import { Employee } from '../models/Employee.model';
import { AppError } from '../utils/AppError';
import { TaskWorkSession } from '../models/TaskWorkSession.model';
import { Task } from '../models/Task.model';
import { Project } from '../models/Project.model';
import { LeaveType } from '../models/Leave.model';
import { getProjectVisibilityScope, getTaskVisibilityScope, ResourceAccessContext } from '../utils/resourceAccess';

/**
 * Thin reporting layer over the repositories - all reports support search/filter
 * and server-side pagination (spec section 17). Deeper cross-entity aggregation
 * (e.g. joined attendance+leave+task reports) can be added per real report specs.
 */
export class ReportService {
  async employees(filters: { search?: string; branch?: string; status?: string }, pagination: PaginationParams) {
    const query: Record<string, unknown> = {};
    if (filters.branch) query.branch = filters.branch;
    if (filters.status) query.status = filters.status;
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['firstName', 'lastName', 'email']));
    return employeeRepository.paginatePopulated(query, pagination);
  }

  async attendance(filters: { employee?: string; from?: string; to?: string }, pagination: PaginationParams) {
    const query: Record<string, unknown> = {};
    if (filters.employee) query.employee = filters.employee;
    if (filters.from || filters.to) {
      query.workDate = {};
      if (filters.from) (query.workDate as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (query.workDate as Record<string, unknown>).$lte = filters.to;
    }
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const [items, total] = await Promise.all([
      AttendanceSession.find(query)
        .sort('-workDate')
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: 'employee', select: 'firstName lastName email' }),
      AttendanceSession.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async leaves(filters: { employee?: string; status?: string }, pagination: PaginationParams) {
    const query: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (filters.employee) query.employee = filters.employee;
    if (filters.status) query.status = filters.status;
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const [items, total] = await Promise.all([
      LeaveRequest.find(query)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .populate([
          { path: 'employee', select: 'firstName lastName email' },
          { path: 'leaveType', select: 'name' },
        ]),
      LeaveRequest.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }


  async attendanceSummary(
    actor: EmployeeAccessContext,
    filters: { employee?: string; from: string; to: string },
    pagination: PaginationParams
  ) {
    const scope = getEmployeeVisibilityScope(actor);
    if (!actor.isAdmin && scope === 'none') {
      throw AppError.forbidden('Employee visibility is required for attendance reports');
    }
    let employeeIds = await employeeRepository.findIdsScoped(actor.id, scope);
    if (filters.employee) {
      if (!employeeIds.includes(filters.employee)) return { items: [], total: 0, page: 1, limit: pagination.limit ?? 20, totalPages: 1 };
      employeeIds = [filters.employee];
    }

    const employees = await Employee.find({ _id: { $in: employeeIds }, isDeleted: { $ne: true } })
      .select('firstName lastName email employeeCode')
      .sort({ firstName: 1, lastName: 1 });
    const fromDate = new Date(`${filters.from}T00:00:00.000`);
    const toDate = new Date(`${filters.to}T23:59:59.999`);
    const [sessions, leaves] = await Promise.all([
      AttendanceSession.find({ employee: { $in: employeeIds }, workDate: { $gte: filters.from, $lte: filters.to } }),
      LeaveRequest.find({
        employee: { $in: employeeIds },
        status: 'approved',
        isDeleted: { $ne: true },
        endDate: { $gte: fromDate },
        startDate: { $lte: toDate },
      }),
    ]);

    const sessionMap = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const id = session.employee.toString();
      const list = sessionMap.get(id) ?? [];
      list.push(session);
      sessionMap.set(id, list);
    }
    const leaveDayMap = new Map<string, Set<string>>();
    const clamp = (d: Date, min: Date, max: Date) => new Date(Math.max(min.getTime(), Math.min(max.getTime(), d.getTime())));
    for (const leave of leaves) {
      const id = leave.employee.toString();
      const set = leaveDayMap.get(id) ?? new Set<string>();
      let current = clamp(new Date(leave.startDate), fromDate, toDate);
      const end = clamp(new Date(leave.endDate), fromDate, toDate);
      current = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (current <= endDay) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        set.add(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }
      leaveDayMap.set(id, set);
    }

    const workedSeconds = (session: (typeof sessions)[number]) => {
      const end = session.checkOutTime ? new Date(session.checkOutTime) : new Date();
      let total = Math.max(0, end.getTime() - new Date(session.checkInTime).getTime());
      for (const b of session.breaks ?? []) {
        const breakEnd = b.breakEnd ? new Date(b.breakEnd) : end;
        total -= Math.max(0, breakEnd.getTime() - new Date(b.breakStart).getTime());
      }
      return Math.max(0, Math.floor(total / 1000));
    };

    const rows = employees.map((employee) => {
      const id = employee._id.toString();
      const employeeSessions = sessionMap.get(id) ?? [];
      const workedDates = new Set(employeeSessions.map((s) => s.workDate));
      return {
        employee: { _id: id, firstName: employee.firstName, lastName: employee.lastName, email: employee.email },
        daysWorked: workedDates.size,
        leaveDays: leaveDayMap.get(id)?.size ?? 0,
        totalWorkingSeconds: employeeSessions.reduce((sum, s) => sum + workedSeconds(s), 0),
        totalSessions: employeeSessions.length,
      };
    });

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const total = rows.length;
    const items = rows.slice((page - 1) * limit, page * limit);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async analytics(
    actor: EmployeeAccessContext & ResourceAccessContext,
    filters: { from: string; to: string }
  ) {
    const employeeScope = getEmployeeVisibilityScope(actor);
    if (!actor.isAdmin && employeeScope === 'none') {
      throw AppError.forbidden('Employee visibility is required for reports');
    }

    const employeeIds = await employeeRepository.findIdsScoped(actor.id, employeeScope);
    const employees = await Employee.find({ _id: { $in: employeeIds }, isDeleted: { $ne: true } })
      .select('firstName lastName email')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    const fromDate = new Date(`${filters.from}T00:00:00.000`);
    const toDate = new Date(`${filters.to}T23:59:59.999`);
    const projectScope = getProjectVisibilityScope(actor);
    const taskScope = getTaskVisibilityScope(actor);
    const relatedProjectIds = projectScope === 'assigned' || taskScope === 'assigned'
      ? await projectRepository.findRelatedIds(actor.id)
      : [];
    const projectAccess = projectRepository.accessFilter(actor.id, projectScope);
    const taskAccess = taskRepository.accessFilter(actor.id, taskScope, relatedProjectIds);

    const visibleProjects = await Project.find({ isDeleted: { $ne: true }, ...projectAccess })
      .select('_id name clientCompany status')
      .populate({ path: 'clientCompany', select: 'companyName' })
      .lean();
    const visibleProjectIds = visibleProjects.map((p) => p._id);
    const visibleTasks = await Task.find({
      isDeleted: { $ne: true },
      ...(visibleProjectIds.length ? { project: { $in: visibleProjectIds } } : {}),
      ...taskAccess,
    }).select('_id title project status').lean();
    const visibleTaskIds = visibleTasks.map((t) => t._id);

    const [attendanceSessions, leaveRequests, workSessions, leaveTypes] = await Promise.all([
      AttendanceSession.find({ employee: { $in: employeeIds }, workDate: { $gte: filters.from, $lte: filters.to } }).lean(),
      LeaveRequest.find({
        employee: { $in: employeeIds },
        isDeleted: { $ne: true },
        endDate: { $gte: fromDate },
        startDate: { $lte: toDate },
      }).lean(),
      TaskWorkSession.find({
        employee: { $in: employeeIds },
        task: { $in: visibleTaskIds },
        startTime: { $lte: toDate },
        $or: [{ endTime: { $gte: fromDate } }, { endTime: null }],
      }).lean(),
      LeaveType.find({ isDeleted: { $ne: true } }).select('_id name defaultDaysPerYear').lean(),
    ]);

    const now = new Date();
    const sessionSeconds = (session: any) => {
      const start = new Date(Math.max(new Date(session.startTime).getTime(), fromDate.getTime()));
      const rawEnd = session.endTime ? new Date(session.endTime) : now;
      const end = new Date(Math.min(rawEnd.getTime(), toDate.getTime()));
      if (end <= start) return 0;
      if (typeof session.durationSeconds === 'number' && session.endTime && new Date(session.startTime) >= fromDate && new Date(session.endTime) <= toDate) {
        return Math.max(0, session.durationSeconds);
      }
      return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    };

    const attendanceSeconds = (session: any) => {
      const start = new Date(session.checkInTime);
      const end = session.checkOutTime ? new Date(session.checkOutTime) : now;
      let total = Math.max(0, end.getTime() - start.getTime());
      for (const b of session.breaks ?? []) {
        const breakEnd = b.breakEnd ? new Date(b.breakEnd) : end;
        total -= Math.max(0, breakEnd.getTime() - new Date(b.breakStart).getTime());
      }
      return Math.max(0, Math.floor(total / 1000));
    };

    const employeeMap = new Map(employees.map((e: any) => [e._id.toString(), e]));
    const employeeStats = new Map<string, any>();
    for (const e of employees as any[]) {
      employeeStats.set(e._id.toString(), {
        employee: { _id: e._id.toString(), firstName: e.firstName, lastName: e.lastName, email: e.email },
        workedDates: new Set<string>(), attendanceSeconds: 0, taskSeconds: 0, automaticSeconds: 0, manualSeconds: 0,
        approvedLeaveDays: new Set<string>(), pendingLeaveDays: new Set<string>(), totalSessions: 0, taskIds: new Set<string>(), completedTaskIds: new Set<string>(),
      });
    }

    for (const a of attendanceSessions as any[]) {
      const stat = employeeStats.get(a.employee.toString());
      if (!stat) continue;
      stat.workedDates.add(a.workDate);
      stat.attendanceSeconds += attendanceSeconds(a);
      stat.totalSessions += 1;
    }

    const addLeaveDays = (set: Set<string>, startValue: any, endValue: any) => {
      let cur = new Date(Math.max(new Date(startValue).getTime(), fromDate.getTime()));
      const end = new Date(Math.min(new Date(endValue).getTime(), toDate.getTime()));
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cur <= endDay) {
        set.add(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);
        cur.setDate(cur.getDate() + 1);
      }
    };

    for (const leave of leaveRequests as any[]) {
      const stat = employeeStats.get(leave.employee.toString());
      if (!stat) continue;
      if (leave.status === 'approved') addLeaveDays(stat.approvedLeaveDays, leave.startDate, leave.endDate);
      if (leave.status === 'pending') addLeaveDays(stat.pendingLeaveDays, leave.startDate, leave.endDate);
    }

    const taskById = new Map((visibleTasks as any[]).map((t) => [t._id.toString(), t]));
    const projectById = new Map((visibleProjects as any[]).map((p) => [p._id.toString(), p]));
    const projectStats = new Map<string, any>();
    const clientStats = new Map<string, any>();
    for (const p of visibleProjects as any[]) {
      projectStats.set(p._id.toString(), { projectId: p._id.toString(), name: p.name, status: p.status, seconds: 0, automaticSeconds: 0, manualSeconds: 0, employees: new Set<string>(), tasks: new Set<string>() });
      const cc: any = p.clientCompany;
      if (cc?._id) {
        const key = cc._id.toString();
        if (!clientStats.has(key)) clientStats.set(key, { clientCompanyId: key, companyName: cc.companyName, seconds: 0, projects: new Set<string>(), employees: new Set<string>(), tasks: new Set<string>() });
        clientStats.get(key).projects.add(p._id.toString());
      }
    }

    const manualEntries: any[] = [];
    for (const ws of workSessions as any[]) {
      const seconds = sessionSeconds(ws);
      const employeeId = ws.employee.toString();
      const taskId = ws.task.toString();
      const stat = employeeStats.get(employeeId);
      const task: any = taskById.get(taskId);
      if (!stat || !task) continue;
      stat.taskSeconds += seconds;
      stat.taskIds.add(taskId);
      if (task.status === 'completed') stat.completedTaskIds.add(taskId);
      if (ws.entryType === 'manual') stat.manualSeconds += seconds; else stat.automaticSeconds += seconds;
      const project: any = projectById.get(task.project.toString());
      if (project) {
        const ps = projectStats.get(project._id.toString());
        ps.seconds += seconds; ps.employees.add(employeeId); ps.tasks.add(taskId);
        if (ws.entryType === 'manual') ps.manualSeconds += seconds; else ps.automaticSeconds += seconds;
        const cc: any = project.clientCompany;
        if (cc?._id) {
          const cs = clientStats.get(cc._id.toString());
          if (cs) { cs.seconds += seconds; cs.employees.add(employeeId); cs.tasks.add(taskId); }
        }
      }
      if (ws.entryType === 'manual') {
        const e: any = employeeMap.get(employeeId);
        manualEntries.push({ employeeId, employeeName: `${e?.firstName ?? ''} ${e?.lastName ?? ''}`.trim(), taskId, taskTitle: task.title, seconds, startTime: ws.startTime, endTime: ws.endTime, reason: ws.manualReason ?? '' });
      }
    }

    const employeesReport = [...employeeStats.values()].map((s: any) => ({
      employee: s.employee,
      daysWorked: s.workedDates.size,
      leaveDays: s.approvedLeaveDays.size,
      pendingLeaveDays: s.pendingLeaveDays.size,
      attendanceSeconds: s.attendanceSeconds,
      taskSeconds: s.taskSeconds,
      automaticSeconds: s.automaticSeconds,
      manualSeconds: s.manualSeconds,
      utilizationPercent: s.attendanceSeconds > 0 ? Math.round((s.taskSeconds / s.attendanceSeconds) * 1000) / 10 : 0,
      totalSessions: s.totalSessions,
      taskCount: s.taskIds.size,
      completedTaskCount: s.completedTaskIds.size,
    })).sort((a, b) => b.taskSeconds - a.taskSeconds);

    const totalAttendanceSeconds = employeesReport.reduce((n, x) => n + x.attendanceSeconds, 0);
    const totalTaskSeconds = employeesReport.reduce((n, x) => n + x.taskSeconds, 0);
    const totalLeaveDays = employeesReport.reduce((n, x) => n + x.leaveDays, 0);
    const totalWorkedDays = employeesReport.reduce((n, x) => n + x.daysWorked, 0);
    const taskStatusCounts = (visibleTasks as any[]).reduce((acc: Record<string, number>, t: any) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {});

    const leaveTypeUsage = leaveTypes.map((lt: any) => {
      const matching = (leaveRequests as any[]).filter((r: any) => r.leaveType.toString() === lt._id.toString());
      let approvedDays = 0; let pendingDays = 0;
      for (const r of matching) {
        const tmp = new Set<string>(); addLeaveDays(tmp, r.startDate, r.endDate);
        if (r.status === 'approved') approvedDays += tmp.size;
        if (r.status === 'pending') pendingDays += tmp.size;
      }
      return { leaveTypeId: lt._id.toString(), name: lt.name, entitlementPerEmployee: lt.defaultDaysPerYear, approvedDays, pendingDays };
    }).sort((a, b) => b.approvedDays - a.approvedDays);

    return {
      range: filters,
      organization: {
        employees: employees.length,
        workedDays: totalWorkedDays,
        leaveDays: totalLeaveDays,
        attendanceSeconds: totalAttendanceSeconds,
        taskSeconds: totalTaskSeconds,
        utilizationPercent: totalAttendanceSeconds > 0 ? Math.round((totalTaskSeconds / totalAttendanceSeconds) * 1000) / 10 : 0,
        tasksCompleted: taskStatusCounts.completed ?? 0,
        activeProjects: (visibleProjects as any[]).filter((p: any) => p.status === 'active').length,
        manualSeconds: employeesReport.reduce((n, x) => n + x.manualSeconds, 0),
      },
      taskStatusCounts,
      employees: employeesReport,
      projects: [...projectStats.values()].map((x: any) => ({ ...x, employees: x.employees.size, tasks: x.tasks.size })).sort((a: any, b: any) => b.seconds - a.seconds).slice(0, 8),
      clients: [...clientStats.values()].map((x: any) => ({ ...x, projects: x.projects.size, employees: x.employees.size, tasks: x.tasks.size })).sort((a: any, b: any) => b.seconds - a.seconds).slice(0, 8),
      leaveTypes: leaveTypeUsage,
      manualEntries: manualEntries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0, 12),
    };
  }

  async projects(filters: { search?: string; status?: string }, pagination: PaginationParams) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['name']));
    return projectRepository.paginatePopulated(query, pagination);
  }

  async tasks(filters: { search?: string; status?: string; project?: string }, pagination: PaginationParams) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.project) query.project = filters.project;
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['title']));
    return taskRepository.paginatePopulated(query, pagination);
  }

  async branches(filters: { search?: string }, pagination: PaginationParams) {
    const query: Record<string, unknown> = {};
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['name']));
    return branchRepository.paginate(query, pagination);
  }

  async clientCompanies(filters: { search?: string; status?: string }, pagination: PaginationParams) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['companyName']));
    return clientCompanyRepository.paginate(query, pagination);
  }
}
export const reportService = new ReportService();
