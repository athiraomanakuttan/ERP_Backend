import { Types } from 'mongoose';
import { TaskWorkSession, ITaskWorkSession } from '../models/TaskWorkSession.model';
import { Task } from '../models/Task.model';

export interface WorkSessionListFilters {
  employee?: string;
  task?: string;
  project?: string;
  from?: Date;
  to?: Date;
  entryType?: 'automatic' | 'manual';
  running?: boolean;
}

export class TaskWorkSessionRepository {
  async findRunningForEmployee(employeeId: string): Promise<ITaskWorkSession | null> {
    return TaskWorkSession.findOne({ employee: employeeId, endTime: null });
  }

  async start(task: string, employee: string): Promise<ITaskWorkSession> {
    return TaskWorkSession.create({ task, employee, startTime: new Date(), entryType: 'automatic' });
  }

  async createManual(data: {
    task: string;
    employee: string;
    startTime: Date;
    endTime: Date;
    durationSeconds: number;
    manualReason: string;
    createdBy: string;
  }): Promise<ITaskWorkSession> {
    return TaskWorkSession.create({
      ...data,
      entryType: 'manual',
      endReason: 'manual_entry',
    });
  }

  async endSession(id: string, endReason: ITaskWorkSession['endReason']): Promise<ITaskWorkSession | null> {
    const session = await TaskWorkSession.findById(id);
    if (!session || session.endTime) return session;
    session.endTime = new Date();
    session.durationSeconds = Math.max(0, Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000));
    session.endReason = endReason;
    await session.save();
    return session;
  }

  async totalSecondsForTaskEmployee(task: string, employee: string): Promise<number> {
    const result = await TaskWorkSession.aggregate([
      {
        $match: {
          task: new Types.ObjectId(task),
          employee: new Types.ObjectId(employee),
          endTime: { $ne: null },
        },
      },
      { $group: { _id: null, total: { $sum: '$durationSeconds' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async totalSecondsForEmployee(employee: string, from?: Date, to?: Date): Promise<number> {
    const match: Record<string, unknown> = {
      employee: new Types.ObjectId(employee),
      endTime: { $ne: null },
    };
    if (from || to) {
      match.startTime = {};
      if (from) (match.startTime as Record<string, unknown>).$gte = from;
      if (to) (match.startTime as Record<string, unknown>).$lte = to;
    }
    const result = await TaskWorkSession.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$durationSeconds' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async hasOverlap(employee: string, startTime: Date, endTime: Date): Promise<boolean> {
    const count = await TaskWorkSession.countDocuments({
      employee,
      startTime: { $lt: endTime },
      $or: [{ endTime: null }, { endTime: { $gt: startTime } }],
    });
    return count > 0;
  }

  private async buildFilter(filters: WorkSessionListFilters): Promise<Record<string, unknown>> {
    const query: Record<string, unknown> = {};
    if (filters.employee) query.employee = new Types.ObjectId(filters.employee);
    if (filters.task) query.task = new Types.ObjectId(filters.task);
    if (filters.entryType) query.entryType = filters.entryType;
    if (filters.running === true) query.endTime = null;
    if (filters.running === false) query.endTime = { $ne: null };
    if (filters.from || filters.to) {
      query.startTime = {};
      if (filters.from) (query.startTime as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (query.startTime as Record<string, unknown>).$lte = filters.to;
    }
    if (filters.project) {
      const taskIds = await Task.find({ project: filters.project, isDeleted: { $ne: true } }).distinct('_id');
      if (filters.task) {
        const selectedTaskId = new Types.ObjectId(filters.task);
        query.task = taskIds.some((id) => id.toString() === filters.task) ? selectedTaskId : { $in: [] };
      } else {
        query.task = { $in: taskIds };
      }
    }
    return query;
  }

  async listDetailed(
    filters: WorkSessionListFilters,
    { page = 1, limit = 20 }: { page?: number; limit?: number }
  ) {
    const query = await this.buildFilter(filters);
    const skip = (page - 1) * limit;
    const [items, total, summary] = await Promise.all([
      TaskWorkSession.find(query)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'firstName lastName email')
        .populate({ path: 'task', select: 'title project', populate: { path: 'project', select: 'name' } })
        .populate('createdBy', 'firstName lastName email')
        .lean(),
      TaskWorkSession.countDocuments(query),
      TaskWorkSession.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSeconds: { $sum: { $ifNull: ['$durationSeconds', 0] } },
            manualSessions: { $sum: { $cond: [{ $eq: ['$entryType', 'manual'] }, 1, 0] } },
            runningSessions: { $sum: { $cond: [{ $eq: ['$endTime', null] }, 1, 0] } },
            sessionCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: summary[0] ?? { totalSeconds: 0, manualSessions: 0, runningSessions: 0, sessionCount: 0 },
    };
  }
  async totalsForTaskIds(taskIds: string[]): Promise<Record<string, number>> {
    if (!taskIds.length) return {};
    const now = new Date();
    const rows = await TaskWorkSession.aggregate([
      { $match: { task: { $in: taskIds.map((id) => new Types.ObjectId(id)) } } },
      {
        $group: {
          _id: '$task',
          total: {
            $sum: {
              $cond: [
                { $ne: ['$endTime', null] },
                { $ifNull: ['$durationSeconds', 0] },
                { $divide: [{ $subtract: [now, '$startTime'] }, 1000] },
              ],
            },
          },
        },
      },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id.toString(), Math.max(0, Math.round(row.total ?? 0))]));
  }

  async projectEmployeeSummary(projectId: string, from?: Date, to?: Date) {
    const now = new Date();
    const match: Record<string, unknown> = {};
    if (from || to) {
      match.startTime = {};
      if (from) (match.startTime as Record<string, unknown>).$gte = from;
      if (to) (match.startTime as Record<string, unknown>).$lte = to;
    }

    const durationExpression = {
      $cond: [
        { $ne: ['$endTime', null] },
        { $ifNull: ['$durationSeconds', 0] },
        { $divide: [{ $subtract: [now, '$startTime'] }, 1000] },
      ],
    };

    return TaskWorkSession.aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $lookup: { from: 'tasks', localField: 'task', foreignField: '_id', as: 'taskDoc' } },
      { $unwind: '$taskDoc' },
      { $match: { 'taskDoc.project': new Types.ObjectId(projectId) } },
      { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeDoc' } },
      { $unwind: '$employeeDoc' },
      { $lookup: { from: 'roles', localField: 'employeeDoc.role', foreignField: '_id', as: 'roleDoc' } },
      {
        $group: {
          _id: '$employee',
          firstName: { $first: '$employeeDoc.firstName' },
          lastName: { $first: '$employeeDoc.lastName' },
          email: { $first: '$employeeDoc.email' },
          department: { $first: '$employeeDoc.department' },
          roleName: { $first: { $arrayElemAt: ['$roleDoc.name', 0] } },
          totalSeconds: { $sum: durationExpression },
          automaticSeconds: {
            $sum: { $cond: [{ $eq: ['$entryType', 'automatic'] }, durationExpression, 0] },
          },
          manualSeconds: {
            $sum: { $cond: [{ $eq: ['$entryType', 'manual'] }, durationExpression, 0] },
          },
          taskIds: { $addToSet: '$task' },
          isWorking: { $max: { $cond: [{ $eq: ['$endTime', null] }, 1, 0] } },
          lastActivityAt: { $max: '$startTime' },
        },
      },
      { $sort: { totalSeconds: -1 } },
      {
        $project: {
          _id: 0,
          employee: {
            _id: '$_id',
            firstName: '$firstName',
            lastName: '$lastName',
            email: '$email',
            department: '$department',
            roleName: '$roleName',
          },
          totalSeconds: { $round: ['$totalSeconds', 0] },
          automaticSeconds: { $round: ['$automaticSeconds', 0] },
          manualSeconds: { $round: ['$manualSeconds', 0] },
          taskCount: { $size: '$taskIds' },
          isWorking: { $eq: ['$isWorking', 1] },
          lastActivityAt: 1,
        },
      },
    ]);
  }

  async projectEmployeeTaskSummary(projectId: string, employeeId: string, from?: Date, to?: Date) {
    const now = new Date();
    const match: Record<string, unknown> = { employee: new Types.ObjectId(employeeId) };
    if (from || to) {
      match.startTime = {};
      if (from) (match.startTime as Record<string, unknown>).$gte = from;
      if (to) (match.startTime as Record<string, unknown>).$lte = to;
    }

    const durationExpression = {
      $cond: [
        { $ne: ['$endTime', null] },
        { $ifNull: ['$durationSeconds', 0] },
        { $divide: [{ $subtract: [now, '$startTime'] }, 1000] },
      ],
    };

    return TaskWorkSession.aggregate([
      { $match: match },
      { $lookup: { from: 'tasks', localField: 'task', foreignField: '_id', as: 'taskDoc' } },
      { $unwind: '$taskDoc' },
      { $match: { 'taskDoc.project': new Types.ObjectId(projectId) } },
      {
        $group: {
          _id: '$task',
          title: { $first: '$taskDoc.title' },
          description: { $first: '$taskDoc.description' },
          status: { $first: '$taskDoc.status' },
          isDeleted: { $first: '$taskDoc.isDeleted' },
          totalSeconds: { $sum: durationExpression },
          automaticSeconds: {
            $sum: { $cond: [{ $eq: ['$entryType', 'automatic'] }, durationExpression, 0] },
          },
          manualSeconds: {
            $sum: { $cond: [{ $eq: ['$entryType', 'manual'] }, durationExpression, 0] },
          },
          sessionCount: { $sum: 1 },
          isWorking: { $max: { $cond: [{ $eq: ['$endTime', null] }, 1, 0] } },
          lastActivityAt: { $max: '$startTime' },
        },
      },
      { $sort: { totalSeconds: -1 } },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          status: 1,
          isArchived: { $eq: ['$isDeleted', true] },
          totalSeconds: { $round: ['$totalSeconds', 0] },
          automaticSeconds: { $round: ['$automaticSeconds', 0] },
          manualSeconds: { $round: ['$manualSeconds', 0] },
          sessionCount: 1,
          isWorking: { $eq: ['$isWorking', 1] },
          lastActivityAt: 1,
        },
      },
    ]);
  }

  async totalsForProjectIds(projectIds: string[]): Promise<Record<string, number>> {
    if (!projectIds.length) return {};
    const projects = projectIds.map((id) => new Types.ObjectId(id));
    const now = new Date();
    const rows = await TaskWorkSession.aggregate([
      { $lookup: { from: 'tasks', localField: 'task', foreignField: '_id', as: 'taskDoc' } },
      { $unwind: '$taskDoc' },
      { $match: { 'taskDoc.project': { $in: projects }, 'taskDoc.isDeleted': { $ne: true } } },
      {
        $group: {
          _id: '$taskDoc.project',
          total: {
            $sum: {
              $cond: [
                { $ne: ['$endTime', null] },
                { $ifNull: ['$durationSeconds', 0] },
                { $divide: [{ $subtract: [now, '$startTime'] }, 1000] },
              ],
            },
          },
        },
      },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id.toString(), Math.max(0, Math.round(row.total ?? 0))]));
  }

}

export const taskWorkSessionRepository = new TaskWorkSessionRepository();
