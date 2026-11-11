import { multiWordSearch } from '../utils/escapeRegex';
import { projectRepository } from '../repositories/ProjectRepository';
import { AppError } from '../utils/AppError';
import { notificationService } from './notification.service';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { getProjectVisibilityScope, getTaskVisibilityScope, ResourceAccessContext } from '../utils/resourceAccess';
import { taskWorkSessionRepository } from '../repositories/TaskWorkSessionRepository';
import { taskRepository } from '../repositories/TaskRepository';

export class ProjectService {
  async create(data: Record<string, unknown>, actor: ResourceAccessContext) {
    if (!actor.isAdmin && data.projectManager && !actor.permissionKeys.includes('projects:assign')) {
      throw AppError.forbidden('You need Project Assign permission to set a project manager');
    }

    const project = await projectRepository.create({ ...data, createdBy: actor.id } as never);
    const admin = await employeeRepository.findAdmin();
    if (admin && admin._id.toString() !== actor.id) {
      await notificationService.notify(admin._id.toString(), 'project_created', {
        title: 'New project created',
        message: `Project "${project.name}" was created.`,
        relatedEntityType: 'Project',
        relatedEntityId: project._id.toString(),
      });
    }
    return project;
  }

  async list(
    actor: ResourceAccessContext,
    filters: { status?: string; clientCompany?: string; search?: string },
    pagination: { page?: number; limit?: number }
  ) {
    const scope = getProjectVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view projects');

    const query: Record<string, unknown> = {
      ...projectRepository.accessFilter(actor.id, scope),
    };
    if (filters.status) query.status = filters.status;
    if (filters.clientCompany) query.clientCompany = filters.clientCompany;
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['name', 'description']));
    const result = await projectRepository.paginatePopulated(query, pagination);
    if (getTaskVisibilityScope(actor) === 'none') return result;
    const totals = await taskWorkSessionRepository.totalsForProjectIds(result.items.map((project) => project._id.toString()));
    return {
      ...result,
      items: result.items.map((project) => ({ ...project.toObject(), totalWorkedSeconds: totals[project._id.toString()] ?? 0 })),
    };
  }

  async clientCompanyOptions(actor: ResourceAccessContext) {
    const scope = getProjectVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view projects');
    return projectRepository.accessibleClientCompanyOptions(actor.id, scope);
  }

  private requireFullProjectAnalytics(actor: ResourceAccessContext) {
    if (actor.isAdmin) return;
    const permissions = actor.permissionKeys ?? [];
    if (!permissions.includes('projects:view_all') || !permissions.includes('tasks:view_all')) {
      throw AppError.forbidden('Full project work details require View All Projects and View All Tasks permissions');
    }
  }

  async getById(actor: ResourceAccessContext, id: string) {
    const scope = getProjectVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view projects');
    const project = await projectRepository.findByIdPopulatedScoped(id, actor.id, scope);
    if (!project) throw AppError.notFound('Project not found');
    return project;
  }

  async workSummary(actor: ResourceAccessContext, id: string, from?: Date, to?: Date) {
    this.requireFullProjectAnalytics(actor);
    const project = await this.getById(actor, id);
    if (getTaskVisibilityScope(actor) === 'none') {
      throw AppError.forbidden('You need task view permission to view project work details');
    }

    const [employees, tasks] = await Promise.all([
      taskWorkSessionRepository.projectEmployeeSummary(id, from, to),
      taskRepository.findByProject(id),
    ]);
    const totalWorkedSeconds = employees.reduce((sum, row) => sum + Number(row.totalSeconds || 0), 0);
    const employeesWorked = employees.length;

    return {
      project,
      summary: {
        totalWorkedSeconds,
        employeesWorked,
        taskCount: tasks.length,
        averageSecondsPerEmployee: employeesWorked ? Math.round(totalWorkedSeconds / employeesWorked) : 0,
      },
      employees,
    };
  }

  async employeeWorkSummary(actor: ResourceAccessContext, id: string, employeeId: string, from?: Date, to?: Date) {
    this.requireFullProjectAnalytics(actor);
    await this.getById(actor, id);
    if (getTaskVisibilityScope(actor) === 'none') {
      throw AppError.forbidden('You need task view permission to view project work details');
    }

    const employees = await taskWorkSessionRepository.projectEmployeeSummary(id, from, to);
    const employeeSummary = employees.find((row) => row.employee?._id?.toString() === employeeId);
    if (!employeeSummary) throw AppError.notFound('No recorded work was found for this employee in the project');

    const tasks = await taskWorkSessionRepository.projectEmployeeTaskSummary(id, employeeId, from, to);
    return { employee: employeeSummary.employee, summary: employeeSummary, tasks };
  }

  async update(actor: ResourceAccessContext, id: string, data: Record<string, unknown>) {
    const scope = getProjectVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this project');
    if (!actor.isAdmin && Object.prototype.hasOwnProperty.call(data, 'projectManager') && !actor.permissionKeys.includes('projects:assign')) {
      throw AppError.forbidden('You need Project Assign permission to change the project manager');
    }
    const project = await projectRepository.updateScoped(id, actor.id, scope, data);
    if (!project) throw AppError.notFound('Project not found');
    return projectRepository.findByIdPopulatedScoped(id, actor.id, scope);
  }

  async addTeamMember(actor: ResourceAccessContext, id: string, employeeId: string) {
    const scope = getProjectVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this project');
    const project = await projectRepository.updateScoped(id, actor.id, scope, { $addToSet: { teamMembers: employeeId } });
    if (!project) throw AppError.notFound('Project not found');
    return projectRepository.findByIdPopulatedScoped(id, actor.id, scope);
  }

  async removeTeamMember(actor: ResourceAccessContext, id: string, employeeId: string) {
    const scope = getProjectVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this project');
    const project = await projectRepository.updateScoped(id, actor.id, scope, { $pull: { teamMembers: employeeId } });
    if (!project) throw AppError.notFound('Project not found');
    return projectRepository.findByIdPopulatedScoped(id, actor.id, scope);
  }

  async remove(actor: ResourceAccessContext, id: string) {
    const scope = getProjectVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this project');
    const result = await projectRepository.softDeleteScoped(id, actor.id, scope);
    if (!result) throw AppError.notFound('Project not found');
  }
}
export const projectService = new ProjectService();
