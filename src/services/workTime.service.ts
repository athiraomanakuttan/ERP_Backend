import { taskWorkSessionRepository } from '../repositories/TaskWorkSessionRepository';
import { taskRepository } from '../repositories/TaskRepository';
import { projectRepository } from '../repositories/ProjectRepository';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { AppError } from '../utils/AppError';
import { canViewAllWorkTime, getProjectVisibilityScope, getTaskVisibilityScope, ResourceAccessContext } from '../utils/resourceAccess';

export class WorkTimeService {
  async list(actor: ResourceAccessContext, filters: {
    employee?: string;
    task?: string;
    project?: string;
    from?: Date;
    to?: Date;
    entryType?: 'automatic' | 'manual';
    running?: boolean;
  }, pagination: { page?: number; limit?: number }) {
    if (canViewAllWorkTime(actor)) {
      return taskWorkSessionRepository.listDetailed(filters, pagination);
    }

    if (!filters.project) {
      throw AppError.forbidden('Project-scoped work time access requires a project filter');
    }
    const projectScope = getProjectVisibilityScope(actor);
    const taskScope = getTaskVisibilityScope(actor);
    if (projectScope === 'none' || taskScope === 'none') {
      throw AppError.forbidden('You do not have permission to view project work time');
    }
    const project = await projectRepository.findByIdPopulatedScoped(filters.project, actor.id, projectScope);
    if (!project) throw AppError.notFound('Project not found');

    if (filters.task) {
      const relatedProjectIds = await projectRepository.findRelatedIds(actor.id);
      const task = await taskRepository.findByIdScoped(filters.task, actor.id, taskScope, relatedProjectIds);
      if (!task || task.project.toString() !== filters.project) {
        throw AppError.forbidden('You do not have access to this task in the selected project');
      }
    }

    return taskWorkSessionRepository.listDetailed(filters, pagination);
  }

  async listForEmployee(employeeId: string, filters: {
    task?: string;
    from?: Date;
    to?: Date;
    entryType?: 'automatic' | 'manual';
    running?: boolean;
  }, pagination: { page?: number; limit?: number }) {
    return taskWorkSessionRepository.listDetailed({ ...filters, employee: employeeId }, pagination);
  }

  async createManual(data: {
    taskId: string;
    employeeId: string;
    startTime: Date;
    endTime: Date;
    reason: string;
  }, adminId: string) {
    const [task, employee] = await Promise.all([
      taskRepository.findById(data.taskId),
      employeeRepository.findById(data.employeeId),
    ]);
    if (!task) throw AppError.notFound('Task not found');
    if (!employee || employee.isDeleted || employee.status !== 'active') throw AppError.notFound('Active employee not found');

    const isMember = await projectRepository.isEmployeeMember(task.project.toString(), data.employeeId);
    const isAssignee = task.assignees.some((id) => id.toString() === data.employeeId);
    if (!isMember || !isAssignee) {
      throw AppError.badRequest('Manual work time can only be added for an employee assigned to this task');
    }
    if (data.endTime > new Date()) {
      throw AppError.badRequest('Manual work time cannot end in the future');
    }
    const overlaps = await taskWorkSessionRepository.hasOverlap(data.employeeId, data.startTime, data.endTime);
    if (overlaps) {
      throw AppError.conflict('This time range overlaps an existing work session for the employee');
    }

    const durationSeconds = Math.round((data.endTime.getTime() - data.startTime.getTime()) / 1000);
    return taskWorkSessionRepository.createManual({
      task: data.taskId,
      employee: data.employeeId,
      startTime: data.startTime,
      endTime: data.endTime,
      durationSeconds,
      manualReason: data.reason.trim(),
      createdBy: adminId,
    });
  }
  async createManualForSelf(data: {
    taskId: string;
    startTime: Date;
    endTime: Date;
    reason: string;
  }, employeeId: string) {
    return this.createManual({ ...data, employeeId }, employeeId);
  }

}

export const workTimeService = new WorkTimeService();
