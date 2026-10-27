import { multiWordSearch } from '../utils/escapeRegex';
import { taskRepository } from '../repositories/TaskRepository';
import { projectRepository } from '../repositories/ProjectRepository';
import { taskWorkSessionRepository } from '../repositories/TaskWorkSessionRepository';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { notificationService } from './notification.service';
import { AppError } from '../utils/AppError';
import { ITask, TaskStatus } from '../models/Task.model';
import { canViewAllWorkTime, getTaskVisibilityScope, ResourceAccessContext, ResourceVisibilityScope } from '../utils/resourceAccess';

export class TaskService {
  private async relatedProjectIds(actor: ResourceAccessContext, scope: ResourceVisibilityScope): Promise<string[]> {
    if (scope !== 'assigned') return [];
    return projectRepository.findManagedIds(actor.id);
  }

  async create(
    data: { title: string; description?: string; project: string; assignees: string[]; priority?: string; dueDate?: Date },
    actor: ResourceAccessContext
  ) {
    if (!actor.isAdmin && !actor.permissionKeys.includes('tasks:assign')) {
      const onlySelf = data.assignees.length === 1 && data.assignees[0] === actor.id;
      if (!onlySelf) {
        throw AppError.forbidden('Without Task Assign permission you can only create a task assigned to yourself');
      }
    }

    for (const employeeId of data.assignees) {
      const isMember = await projectRepository.isEmployeeMember(data.project, employeeId);
      if (!isMember) {
        throw AppError.badRequest(
          `Employee ${employeeId} must be added to the project before being assigned to this task`
        );
      }
    }
    const task = await taskRepository.create({ ...data, createdBy: actor.id } as never);

    const admin = await employeeRepository.findAdmin();
    if (admin && admin._id.toString() !== actor.id) {
      await notificationService.notify(admin._id.toString(), 'task_created', {
        title: 'New task created',
        message: `Task "${task.title}" was created.`,
        relatedEntityType: 'Task',
        relatedEntityId: task._id.toString(),
      });
    }
    for (const employeeId of data.assignees) {
      if (employeeId !== actor.id) {
        await notificationService.notify(employeeId, 'task_created', {
          title: 'You were assigned a task',
          message: `You were assigned to "${task.title}".`,
          relatedEntityType: 'Task',
          relatedEntityId: task._id.toString(),
        });
      }
    }
    return task;
  }

  async list(
    actor: ResourceAccessContext,
    filters: { project?: string; company?: string; assignee?: string; status?: string; priority?: string; dueFrom?: string; dueTo?: string; search?: string },
    pagination: { page?: number; limit?: number }
  ) {
    const scope = getTaskVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view tasks');
    const projectIds = await this.relatedProjectIds(actor, scope);
    const query: Record<string, unknown> = {
      ...taskRepository.accessFilter(actor.id, scope, projectIds),
    };
    if (filters.project) {
      query.project = filters.project;
    } else if (filters.company) {
      const companyProjects = await projectRepository.findByClientCompany(filters.company);
      query.project = { $in: companyProjects.map((project) => project._id) };
    }
    if (filters.assignee) query.assignees = filters.assignee;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.dueFrom || filters.dueTo) {
      const dueDate: Record<string, Date> = {};
      if (filters.dueFrom) dueDate.$gte = new Date(`${filters.dueFrom}T00:00:00.000Z`);
      if (filters.dueTo) dueDate.$lte = new Date(`${filters.dueTo}T23:59:59.999Z`);
      query.dueDate = dueDate;
    }
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['title', 'description']));
    const result = await taskRepository.paginatePopulated(query, pagination);
    if (!canViewAllWorkTime(actor)) return result;
    const totals = await taskWorkSessionRepository.totalsForTaskIds(result.items.map((task) => task._id.toString()));
    return {
      ...result,
      items: result.items.map((task) => ({ ...task.toObject(), totalWorkedSeconds: totals[task._id.toString()] ?? 0 })),
    };
  }


  async filterOptions(actor: ResourceAccessContext) {
    const scope = getTaskVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view tasks');
    const projectIds = await this.relatedProjectIds(actor, scope);
    return taskRepository.filterOptions(actor.id, scope, projectIds);
  }

  async getById(id: string): Promise<ITask> {
    const task = await taskRepository.findById(id);
    if (!task) throw AppError.notFound('Task not found');
    return task;
  }

  async getByIdScoped(actor: ResourceAccessContext, id: string): Promise<ITask> {
    const scope = getTaskVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view tasks');
    const projectIds = await this.relatedProjectIds(actor, scope);
    const task = await taskRepository.findByIdScoped(id, actor.id, scope, projectIds);
    if (!task) throw AppError.notFound('Task not found');
    return task;
  }

  async getByIdForResponse(actor: ResourceAccessContext, id: string): Promise<ITask> {
    const scope = getTaskVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view tasks');
    const projectIds = await this.relatedProjectIds(actor, scope);
    const task = await taskRepository.findByIdPopulatedScoped(id, actor.id, scope, projectIds);
    if (!task) throw AppError.notFound('Task not found');
    return task;
  }

  async update(actor: ResourceAccessContext, id: string, data: Record<string, unknown>) {
    const scope = getTaskVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this task');
    const projectIds = await this.relatedProjectIds(actor, scope);
    const existingTask = await taskRepository.findByIdScoped(id, actor.id, scope, projectIds);
    if (!existingTask) throw AppError.notFound('Task not found');

    if (data.assignees) {
      for (const employeeId of data.assignees as string[]) {
        const isMember = await projectRepository.isEmployeeMember(existingTask.project.toString(), employeeId);
        if (!isMember) {
          throw AppError.badRequest(`Employee ${employeeId} must be added to the project before being assigned`);
        }
      }
    }
    const task = await taskRepository.updateScoped(id, actor.id, scope, projectIds, data);
    if (!task) throw AppError.notFound('Task not found');
    return this.getByIdForResponse(actor, id);
  }

  async assignEmployee(actor: ResourceAccessContext, taskId: string, employeeId: string) {
    const scope = getTaskVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this task');
    const projectIds = await this.relatedProjectIds(actor, scope);
    const task = await taskRepository.findByIdScoped(taskId, actor.id, scope, projectIds);
    if (!task) throw AppError.notFound('Task not found');
    const isMember = await projectRepository.isEmployeeMember(task.project.toString(), employeeId);
    if (!isMember) throw AppError.badRequest('Employee must be added to the project first');
    await taskRepository.updateScoped(taskId, actor.id, scope, projectIds, { $addToSet: { assignees: employeeId } });
    return this.getByIdForResponse(actor, taskId);
  }

  private async resolveApprover(employeeId: string): Promise<string> {
    const employee = await employeeRepository.findById(employeeId);
    const teamLeadId = employee?.teamLead?.toString();
    if (teamLeadId && teamLeadId !== employeeId) return teamLeadId;
    const managerId = employee?.reportingManager?.toString();
    if (managerId && managerId !== employeeId) return managerId;
    const admin = await employeeRepository.findAdmin();
    if (!admin) throw AppError.badRequest('No approver could be resolved for this task');
    if (admin._id.toString() === employeeId) {
      throw AppError.badRequest('An independent approver could not be resolved. You cannot approve your own task.');
    }
    return admin._id.toString();
  }

  async changeStatus(actor: ResourceAccessContext, taskId: string, newStatus: TaskStatus) {
    const task = await this.getByIdScoped(actor, taskId);
    const isAssignee = task.assignees.some((assigneeId) => assigneeId.toString() === actor.id);
    const canEditStatus = actor.isAdmin || actor.permissionKeys.includes('tasks:edit') || isAssignee;
    if (!canEditStatus) throw AppError.forbidden('You do not have permission to change this task status');

    // Admin status changes are an explicit administrative override. They do not enter
    // the employee approval workflow, so Admin can correct/manage task states directly.
    if (actor.isAdmin && newStatus === 'completed') {
      const running = await taskWorkSessionRepository.findRunningForEmployee(actor.id);
      if (running?.task.toString() === taskId) {
        await taskWorkSessionRepository.endSession(running._id.toString(), 'task_completed');
      }
      task.status = 'completed';
      task.pendingApprover = undefined;
      task.submittedBy = undefined;
      task.submittedForApprovalAt = undefined;
      task.approvedBy = actor.id as never;
      task.approvedAt = new Date();
      await task.save();
      return this.getByIdForResponse(actor, taskId);
    }

    if (newStatus === 'completed' && task.status !== 'pending_approval') {
      const approver = await this.resolveApprover(actor.id);
      const running = await taskWorkSessionRepository.findRunningForEmployee(actor.id);
      if (running?.task.toString() === taskId) {
        await taskWorkSessionRepository.endSession(running._id.toString(), 'task_completed');
      }
      task.status = 'pending_approval';
      task.pendingApprover = approver as never;
      task.submittedBy = actor.id as never;
      task.submittedForApprovalAt = new Date();
      await task.save();
      await notificationService.notify(approver, 'task_submitted', {
        title: 'Task pending your approval',
        message: `"${task.title}" was marked complete and needs your approval.`,
        relatedEntityType: 'Task',
        relatedEntityId: task._id.toString(),
      });
      return this.getByIdForResponse(actor, taskId);
    }

    task.status = newStatus;
    task.pendingApprover = undefined;
    await task.save();
    return this.getByIdForResponse(actor, taskId);
  }

  async decideApproval(actor: ResourceAccessContext, taskId: string, decision: 'approve' | 'reopen') {
    const task = await this.getById(taskId);
    if (task.status !== 'pending_approval') throw AppError.badRequest('Task is not pending approval');

    const workedOnTask = task.assignees.some((assigneeId) => assigneeId.toString() === actor.id);
    const submittedOwnTask = task.submittedBy?.toString() === actor.id;
    if (workedOnTask || submittedOwnTask) {
      throw AppError.forbidden('You cannot approve or reopen a task that you worked on or submitted yourself');
    }
    if (!actor.isAdmin && task.pendingApprover?.toString() !== actor.id) {
      throw AppError.forbidden('This task is assigned to another approver');
    }
    const requiredPermission = decision === 'approve' ? 'tasks:approve' : 'tasks:reject';
    if (!actor.isAdmin && !actor.permissionKeys.includes(requiredPermission)) {
      throw AppError.forbidden(`You do not have permission to ${decision === 'approve' ? 'approve' : 'reopen'} this task`);
    }

    task.status = decision === 'approve' ? 'completed' : 'reopened';
    task.pendingApprover = undefined;
    task.approvedBy = decision === 'approve' ? (actor.id as never) : undefined;
    task.approvedAt = decision === 'approve' ? new Date() : undefined;
    await task.save();

    for (const assigneeId of task.assignees) {
      await notificationService.notify(assigneeId.toString(), 'task_completed', {
        title: decision === 'approve' ? 'Task approved' : 'Task reopened',
        message: `"${task.title}" was ${decision === 'approve' ? 'approved as Completed' : 'reopened'}.`,
        relatedEntityType: 'Task',
        relatedEntityId: task._id.toString(),
      });
    }
    return this.getByIdForResponse(actor, taskId);
  }

  async remove(actor: ResourceAccessContext, id: string) {
    const scope = getTaskVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this task');
    const projectIds = await this.relatedProjectIds(actor, scope);
    const result = await taskRepository.softDeleteScoped(id, actor.id, scope, projectIds);
    if (!result) throw AppError.notFound('Task not found');
  }

  async startTimer(taskId: string, employeeId: string) {
    const task = await this.getById(taskId);
    const isAssignee = task.assignees.some((a) => a.toString() === employeeId);
    if (!isAssignee) throw AppError.forbidden('You are not assigned to this task');
    if (['pending_approval', 'completed', 'cancelled'].includes(task.status)) {
      throw AppError.conflict(`Timer cannot be started while the task is ${task.status.replace('_', ' ')}`);
    }

    const running = await taskWorkSessionRepository.findRunningForEmployee(employeeId);
    if (running) throw AppError.conflict('Pause your current task before starting another one');
    if (['to_do', 'on_hold', 'reopened'].includes(task.status)) {
      task.status = 'in_progress';
      await task.save();
    }
    return taskWorkSessionRepository.start(taskId, employeeId);
  }

  async pauseTimer(employeeId: string, reason: 'manual_pause' | 'checkout' | 'break_start' | 'logout' = 'manual_pause') {
    const running = await taskWorkSessionRepository.findRunningForEmployee(employeeId);
    if (!running) throw AppError.badRequest('No running task to pause');
    return taskWorkSessionRepository.endSession(running._id.toString(), reason);
  }

  async pauseTimerIfRunning(employeeId: string, reason: 'checkout' | 'break_start' | 'logout') {
    const running = await taskWorkSessionRepository.findRunningForEmployee(employeeId);
    if (!running) return null;
    return taskWorkSessionRepository.endSession(running._id.toString(), reason);
  }

  async getTotalTime(actor: ResourceAccessContext, taskId: string, employeeId: string) {
    await this.getByIdScoped(actor, taskId);
    const seconds = await taskWorkSessionRepository.totalSecondsForTaskEmployee(taskId, employeeId);
    return { taskId, employeeId, totalSeconds: seconds };
  }

  async getCurrentTimer(employeeId: string) {
    const running = await taskWorkSessionRepository.findRunningForEmployee(employeeId);
    if (!running) return null;
    const completedSeconds = await taskWorkSessionRepository.totalSecondsForTaskEmployee(running.task.toString(), employeeId);
    return { taskId: running.task.toString(), startTime: running.startTime, completedSeconds };
  }
}
export const taskService = new TaskService();
