import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { LeaveType, ILeaveType, LeaveRequest, ILeaveRequest, LeaveStatus } from '../models/Leave.model';

export class LeaveTypeRepository extends BaseRepository<ILeaveType> {
  constructor() {
    super(LeaveType);
  }

  async listActive(): Promise<ILeaveType[]> {
    return LeaveType.find({ isDeleted: { $ne: true } }).sort('name');
  }
}
export const leaveTypeRepository = new LeaveTypeRepository();

const POPULATE_FIELDS = [
  { path: 'employee', select: 'firstName lastName email' },
  { path: 'leaveType', select: 'name' },
  { path: 'decidedBy', select: 'firstName lastName' },
  { path: 'currentApprover', select: 'firstName lastName' },
];

function dateFilter(from?: Date, to?: Date): FilterQuery<ILeaveRequest> {
  if (!from && !to) return {};
  // Include leave requests whose leave period overlaps the selected filter range.
  const query: FilterQuery<ILeaveRequest> = {};
  if (from) query.endDate = { $gte: from };
  if (to) query.startDate = { $lte: to };
  return query;
}

export class LeaveRequestRepository extends BaseRepository<ILeaveRequest> {
  constructor() {
    super(LeaveRequest);
  }

  async findByEmployee(employeeId: string, from?: Date, to?: Date): Promise<ILeaveRequest[]> {
    return LeaveRequest.find({ employee: employeeId, isDeleted: { $ne: true }, ...dateFilter(from, to) })
      .sort('-createdAt')
      .populate(POPULATE_FIELDS);
  }

  async findPendingForApprover(approverId: string, from?: Date, to?: Date): Promise<ILeaveRequest[]> {
    return LeaveRequest.find({
      currentApprover: approverId,
      status: 'pending',
      isDeleted: { $ne: true },
      ...dateFilter(from, to),
    })
      .sort('-createdAt')
      .populate(POPULATE_FIELDS);
  }

  async findAllPending(from?: Date, to?: Date): Promise<ILeaveRequest[]> {
    return LeaveRequest.find({ status: 'pending', isDeleted: { $ne: true }, ...dateFilter(from, to) })
      .sort('-createdAt')
      .populate(POPULATE_FIELDS);
  }

  async findReviewedBy(decidedBy: string, from?: Date, to?: Date, status?: Extract<LeaveStatus, 'approved' | 'rejected'>): Promise<ILeaveRequest[]> {
    const statuses: LeaveStatus[] = status ? [status] : ['approved', 'rejected'];
    return LeaveRequest.find({
      decidedBy,
      status: { $in: statuses },
      isDeleted: { $ne: true },
      ...dateFilter(from, to),
    })
      .sort('-decidedAt')
      .populate(POPULATE_FIELDS);
  }

  async findReviewedForEmployees(employeeIds: string[], from?: Date, to?: Date, status?: Extract<LeaveStatus, 'approved' | 'rejected'>): Promise<ILeaveRequest[]> {
    if (employeeIds.length === 0) return [];
    const statuses: LeaveStatus[] = status ? [status] : ['approved', 'rejected'];
    return LeaveRequest.find({
      employee: { $in: employeeIds },
      status: { $in: statuses },
      isDeleted: { $ne: true },
      ...dateFilter(from, to),
    })
      .sort('-decidedAt')
      .populate(POPULATE_FIELDS);
  }


  async findCountedForEmployeeTypeYear(employeeId: string, leaveTypeId: string, year: number): Promise<ILeaveRequest[]> {
    const from = new Date(`${year}-01-01T00:00:00.000`);
    const to = new Date(`${year}-12-31T23:59:59.999`);
    return LeaveRequest.find({
      employee: employeeId,
      leaveType: leaveTypeId,
      status: { $in: ['pending', 'approved'] },
      isDeleted: { $ne: true },
      endDate: { $gte: from },
      startDate: { $lte: to },
    }).sort('startDate');
  }

  async findAllReviewed(from?: Date, to?: Date, status?: Extract<LeaveStatus, 'approved' | 'rejected'>): Promise<ILeaveRequest[]> {
    const statuses: LeaveStatus[] = status ? [status] : ['approved', 'rejected'];
    return LeaveRequest.find({
      status: { $in: statuses },
      isDeleted: { $ne: true },
      ...dateFilter(from, to),
    })
      .sort('-decidedAt')
      .populate(POPULATE_FIELDS);
  }
}
export const leaveRequestRepository = new LeaveRequestRepository();
