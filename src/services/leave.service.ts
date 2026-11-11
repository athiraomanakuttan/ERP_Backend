import { leaveTypeRepository, leaveRequestRepository } from '../repositories/LeaveRepository';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { notificationService } from './notification.service';
import { AppError } from '../utils/AppError';
import { LeaveStatus } from '../models/Leave.model';
import { getEmployeeVisibilityScope } from '../utils/employeeAccess';

export class LeaveTypeService {
  async create(data: { name: string; defaultDaysPerYear: number; description?: string }) {
    return leaveTypeRepository.create(data as never);
  }
  async list() {
    return leaveTypeRepository.listActive();
  }
  async update(id: string, data: Partial<{ name: string; defaultDaysPerYear: number; description?: string }>) {
    const type = await leaveTypeRepository.updateById(id, data as never);
    if (!type || type.isDeleted) throw AppError.notFound('Leave type not found');
    return type;
  }
  async remove(id: string) {
    const type = await leaveTypeRepository.findById(id);
    if (!type || type.isDeleted) throw AppError.notFound('Leave type not found');
    await leaveTypeRepository.softDeleteById(id);
  }
}
export const leaveTypeService = new LeaveTypeService();

interface LeaveActor {
  id: string;
  isAdmin: boolean;
  permissionKeys: string[];
}


function inclusiveDaysWithinYear(start: Date, end: Date, year: number): number {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  const normalize = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const actualStart = normalize(start) > yearStart ? normalize(start) : yearStart;
  const actualEnd = normalize(end) < yearEnd ? normalize(end) : yearEnd;
  if (actualEnd < actualStart) return 0;
  return Math.floor((actualEnd.getTime() - actualStart.getTime()) / 86400000) + 1;
}

export interface LeaveBalanceItem {
  leaveTypeId: string;
  leaveTypeName: string;
  entitlement: number;
  approvedDays: number;
  pendingDays: number;
  usedOrReservedDays: number;
  balanceDays: number;
  year: number;
}

export class LeaveRequestService {
  private async balanceForType(employeeId: string, leaveTypeId: string, entitlement: number, year: number) {
    const requests = await leaveRequestRepository.findCountedForEmployeeTypeYear(employeeId, leaveTypeId, year);
    let approvedDays = 0;
    let pendingDays = 0;
    for (const request of requests) {
      const days = inclusiveDaysWithinYear(request.startDate, request.endDate, year);
      if (request.status === 'approved') approvedDays += days;
      if (request.status === 'pending') pendingDays += days;
    }
    const usedOrReservedDays = approvedDays + pendingDays;
    return { approvedDays, pendingDays, usedOrReservedDays, balanceDays: Math.max(0, entitlement - usedOrReservedDays) };
  }

  async balances(actor: LeaveActor, employeeId: string, year = new Date().getFullYear()): Promise<LeaveBalanceItem[]> {
    if (!actor.isAdmin && actor.id !== employeeId) {
      const scope = getEmployeeVisibilityScope(actor);
      if (scope === 'none') throw AppError.forbidden('You do not have access to this employee leave balance');
      const allowed = await employeeRepository.findByIdPopulatedScoped(employeeId, actor.id, scope);
      if (!allowed) throw AppError.forbidden('This employee is outside your allowed employee scope');
    }
    const types = await leaveTypeRepository.listActive();
    const items: LeaveBalanceItem[] = [];
    for (const type of types) {
      const totals = await this.balanceForType(employeeId, type._id.toString(), type.defaultDaysPerYear, year);
      items.push({
        leaveTypeId: type._id.toString(),
        leaveTypeName: type.name,
        entitlement: type.defaultDaysPerYear,
        ...totals,
        year,
      });
    }
    return items;
  }

  /** Approval hierarchy: Reporting Manager -> Team Lead -> Admin (spec section 11). */
  private async resolveFirstApprover(employeeId: string): Promise<string> {
    const employee = await employeeRepository.findById(employeeId);
    if (employee?.reportingManager) return employee.reportingManager.toString();
    if (employee?.teamLead) return employee.teamLead.toString();
    const admin = await employeeRepository.findAdmin();
    if (!admin) throw AppError.badRequest('No approver could be resolved for this leave request');
    return admin._id.toString();
  }

  async create(employeeId: string, data: { leaveType: string; startDate: Date; endDate: Date; reason?: string }) {
    const leaveType = await leaveTypeRepository.findById(data.leaveType);
    if (!leaveType || leaveType.isDeleted) throw AppError.badRequest('Selected leave type is not available');

    // Reserve both approved and pending requests so multiple simultaneous requests cannot exceed entitlement.
    for (let year = data.startDate.getUTCFullYear(); year <= data.endDate.getUTCFullYear(); year += 1) {
      const requestedDays = inclusiveDaysWithinYear(data.startDate, data.endDate, year);
      if (!requestedDays) continue;
      const balance = await this.balanceForType(employeeId, data.leaveType, leaveType.defaultDaysPerYear, year);
      if (requestedDays > balance.balanceDays) {
        throw AppError.badRequest(`${leaveType.name} balance exceeded for ${year}. Available: ${balance.balanceDays} day(s), requested: ${requestedDays} day(s).`);
      }
    }

    const approver = await this.resolveFirstApprover(employeeId);
    const request = await leaveRequestRepository.create({ ...data, employee: employeeId, currentApprover: approver } as never);

    await notificationService.notify(approver, 'leave_requested', {
      title: 'New leave request',
      message: `A leave request needs your review.`,
      relatedEntityType: 'LeaveRequest',
      relatedEntityId: request._id.toString(),
    });
    // Admin receives an informational copy because Admin must see every leave request.
    const admin = await employeeRepository.findAdmin();
    if (admin && admin._id.toString() !== approver) {
      await notificationService.notify(admin._id.toString(), 'leave_requested', {
        title: 'New leave request submitted',
        message: `A leave request was submitted and is awaiting review by its assigned approver.`,
        relatedEntityType: 'LeaveRequest',
        relatedEntityId: request._id.toString(),
      });
    }
    return request;
  }

  async myRequests(employeeId: string, from?: Date, to?: Date) {
    return leaveRequestRepository.findByEmployee(employeeId, from, to);
  }

  /** Admin sees every pending request; others see only requests currently routed to them. */
  async pendingFor(employeeId: string, isAdmin: boolean, from?: Date, to?: Date) {
    if (isAdmin) return leaveRequestRepository.findAllPending(from, to);
    return leaveRequestRepository.findPendingForApprover(employeeId, from, to);
  }

  async reviewedFor(actor: LeaveActor, from?: Date, to?: Date, status?: Extract<LeaveStatus, 'approved' | 'rejected'>, employeeId?: string) {
    if (employeeId) {
      if (!actor.isAdmin) {
        const scope = getEmployeeVisibilityScope(actor);
        if (scope === 'none') throw AppError.forbidden('You do not have access to this employee leave history');
        const allowed = await employeeRepository.findByIdPopulatedScoped(employeeId, actor.id, scope);
        if (!allowed) throw AppError.forbidden('This employee is outside your allowed employee scope');
      }
      return leaveRequestRepository.findReviewedForEmployees([employeeId], from, to, status);
    }
    if (actor.isAdmin) return leaveRequestRepository.findAllReviewed(from, to, status);
    if (actor.permissionKeys.includes('leaves:view')) {
      const employeeScope = getEmployeeVisibilityScope(actor);
      if (employeeScope !== 'none') {
        const employeeIds = await employeeRepository.findIdsScoped(actor.id, employeeScope);
        return leaveRequestRepository.findReviewedForEmployees(employeeIds, from, to, status);
      }
    }
    // Approvers without a broader employee-view scope can still review decisions they personally made.
    return leaveRequestRepository.findReviewedBy(actor.id, from, to, status);
  }

  async decide(
    requestId: string,
    decision: 'approve' | 'reject',
    actor: LeaveActor,
    decisionNote?: string
  ) {
    const request = await leaveRequestRepository.findById(requestId);
    if (!request) throw AppError.notFound('Leave request not found');
    if (request.status !== 'pending') throw AppError.badRequest('Leave request is not pending');

    if (!actor.isAdmin) {
      const requiredPermission = decision === 'approve' ? 'leaves:approve' : 'leaves:reject';
      if (!actor.permissionKeys.includes(requiredPermission)) {
        throw AppError.forbidden(`You do not have permission to ${decision} leave requests`);
      }
      if (!request.currentApprover || request.currentApprover.toString() !== actor.id) {
        throw AppError.forbidden('This leave request is assigned to another approver');
      }
    }

    request.status = decision === 'approve' ? 'approved' : 'rejected';
    request.decidedBy = actor.id as never;
    request.decidedAt = new Date();
    request.decisionNote = decisionNote;
    await request.save();

    await notificationService.notify(request.employee.toString(), decision === 'approve' ? 'leave_approved' : 'leave_rejected', {
      title: `Leave request ${decision === 'approve' ? 'approved' : 'rejected'}`,
      message: decisionNote ?? `Your leave request was ${decision === 'approve' ? 'approved' : 'rejected'}.`,
      relatedEntityType: 'LeaveRequest',
      relatedEntityId: request._id.toString(),
    });
    return request;
  }

  /** Employee may cancel before approval; approved leave cannot be cancelled by the employee. */
  async cancel(requestId: string, employeeId: string) {
    const request = await leaveRequestRepository.findById(requestId);
    if (!request) throw AppError.notFound('Leave request not found');
    if (request.employee.toString() !== employeeId) throw AppError.forbidden('You can only cancel your own request');
    if (request.status !== 'pending') throw AppError.badRequest('Only a pending request can be cancelled');
    request.status = 'cancelled';
    await request.save();
    return request;
  }
}
export const leaveRequestService = new LeaveRequestService();
