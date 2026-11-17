import { BaseRepository } from './BaseRepository';
import { Task, ITask } from '../models/Task.model';
import { ResourceVisibilityScope } from '../utils/resourceAccess';
import { Project } from '../models/Project.model';
import { ClientCompany } from '../models/ClientCompany.model';

const POPULATE_FIELDS = [
  { path: 'project', select: 'name status' },
  { path: 'assignees', select: 'firstName lastName email' },
  { path: 'approvedBy', select: 'firstName lastName email' },
  { path: 'pendingApprover', select: 'firstName lastName email' },
  { path: 'submittedBy', select: 'firstName lastName email' },
  { path: 'createdBy', select: 'firstName lastName email' },
];

export class TaskRepository extends BaseRepository<ITask> {
  constructor() {
    super(Task);
  }

  accessFilter(actorId: string, scope: ResourceVisibilityScope, relatedProjectIds: string[] = []): Record<string, unknown> {
    if (scope === 'admin' || scope === 'all') return {};
    if (scope === 'assigned') {
      const related: Record<string, unknown>[] = [
        { assignees: actorId },
        { createdBy: actorId },
        { pendingApprover: actorId },
      ];
      if (relatedProjectIds.length) related.push({ project: { $in: relatedProjectIds } });
      return { $or: related };
    }
    return { _id: { $exists: false } };
  }


  async filterOptions(actorId: string, scope: ResourceVisibilityScope, relatedProjectIds: string[] = []) {
    const taskFilter = {
      isDeleted: { $ne: true },
      ...this.accessFilter(actorId, scope, relatedProjectIds),
    };
    const projectIds = await Task.distinct('project', taskFilter);
    const projects = await Project.find({
      _id: { $in: projectIds },
      isDeleted: { $ne: true },
    })
      .select('_id name clientCompany')
      .sort({ name: 1 })
      .lean();

    const companyIds = [...new Set(projects.map((project) => project.clientCompany?.toString()).filter(Boolean))];
    const companies = await ClientCompany.find({
      _id: { $in: companyIds },
      isDeleted: { $ne: true },
    })
      .select('_id companyName')
      .sort({ companyName: 1 })
      .lean();

    return { projects, companies };
  }

  async findByProject(projectId: string): Promise<ITask[]> {
    return Task.find({ project: projectId, isDeleted: { $ne: true } });
  }

  async findByAssignee(employeeId: string): Promise<ITask[]> {
    return Task.find({ assignees: employeeId, isDeleted: { $ne: true } });
  }

  async findByIdPopulated(id: string): Promise<ITask | null> {
    return Task.findOne({ _id: id, isDeleted: { $ne: true } }).populate(POPULATE_FIELDS);
  }

  async findByIdScoped(id: string, actorId: string, scope: ResourceVisibilityScope, relatedProjectIds: string[] = []): Promise<ITask | null> {
    return Task.findOne({ _id: id, isDeleted: { $ne: true }, ...this.accessFilter(actorId, scope, relatedProjectIds) });
  }

  async findByIdPopulatedScoped(id: string, actorId: string, scope: ResourceVisibilityScope, relatedProjectIds: string[] = []): Promise<ITask | null> {
    return Task.findOne({ _id: id, isDeleted: { $ne: true }, ...this.accessFilter(actorId, scope, relatedProjectIds) }).populate(POPULATE_FIELDS);
  }

  async updateScoped(id: string, actorId: string, scope: ResourceVisibilityScope, relatedProjectIds: string[], update: Record<string, unknown>): Promise<ITask | null> {
    return Task.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, ...this.accessFilter(actorId, scope, relatedProjectIds) },
      update,
      { new: true, runValidators: true }
    );
  }

  async softDeleteScoped(id: string, actorId: string, scope: ResourceVisibilityScope, relatedProjectIds: string[]): Promise<ITask | null> {
    return Task.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, ...this.accessFilter(actorId, scope, relatedProjectIds) },
      { isDeleted: true },
      { new: true }
    );
  }

  async paginatePopulated(
    filter: Record<string, unknown>,
    { page = 1, limit = 20, sort = '-createdAt' }: { page?: number; limit?: number; sort?: string }
  ) {
    const query = { ...filter, isDeleted: { $ne: true } };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Task.find(query).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Task.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }
}

export const taskRepository = new TaskRepository();
