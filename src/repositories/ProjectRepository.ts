import { BaseRepository } from './BaseRepository';
import { Project, IProject } from '../models/Project.model';
import { Types } from 'mongoose';
import { ResourceVisibilityScope } from '../utils/resourceAccess';
import { ClientCompany } from '../models/ClientCompany.model';

const POPULATE_FIELDS = [
  { path: 'clientCompany', select: 'companyName status' },
  { path: 'projectManager', select: 'firstName lastName email' },
  { path: 'teamMembers', select: 'firstName lastName email' },
  { path: 'createdBy', select: 'firstName lastName email' },
];

export class ProjectRepository extends BaseRepository<IProject> {
  constructor() {
    super(Project);
  }

  accessFilter(actorId: string, scope: ResourceVisibilityScope): Record<string, unknown> {
    if (scope === 'admin' || scope === 'all') return {};
    if (scope === 'assigned') {
      return {
        $or: [
          { projectManager: actorId },
          { teamMembers: actorId },
          { createdBy: actorId },
        ],
      };
    }
    return { _id: { $exists: false } };
  }

  async findRelatedIds(actorId: string): Promise<string[]> {
    const projects = await Project.find({
      isDeleted: { $ne: true },
      $or: [{ projectManager: actorId }, { teamMembers: actorId }, { createdBy: actorId }],
    }).select('_id').lean();
    return projects.map((project) => project._id.toString());
  }


  async findManagedIds(actorId: string): Promise<string[]> {
    const projects = await Project.find({
      isDeleted: { $ne: true },
      $or: [{ projectManager: actorId }, { createdBy: actorId }],
    }).select('_id').lean();
    return projects.map((project) => project._id.toString());
  }

  async isEmployeeMember(projectId: string, employeeId: string): Promise<boolean> {
    const count = await Project.countDocuments({
      _id: projectId,
      isDeleted: { $ne: true },
      teamMembers: new Types.ObjectId(employeeId),
    });
    return count > 0;
  }


  async accessibleClientCompanyOptions(actorId: string, scope: ResourceVisibilityScope) {
    const ids = await Project.distinct('clientCompany', {
      isDeleted: { $ne: true },
      ...this.accessFilter(actorId, scope),
    });
    return ClientCompany.find({
      _id: { $in: ids },
      isDeleted: { $ne: true },
    }).select('_id companyName').sort({ companyName: 1 }).lean();
  }

  async findByClientCompany(clientCompanyId: string): Promise<IProject[]> {
    return Project.find({ clientCompany: clientCompanyId, isDeleted: { $ne: true } });
  }

  async findByIdPopulated(id: string): Promise<IProject | null> {
    return Project.findOne({ _id: id, isDeleted: { $ne: true } }).populate(POPULATE_FIELDS);
  }

  async findByIdPopulatedScoped(id: string, actorId: string, scope: ResourceVisibilityScope): Promise<IProject | null> {
    return Project.findOne({ _id: id, isDeleted: { $ne: true }, ...this.accessFilter(actorId, scope) }).populate(POPULATE_FIELDS);
  }

  async updateScoped(id: string, actorId: string, scope: ResourceVisibilityScope, update: Record<string, unknown>): Promise<IProject | null> {
    return Project.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, ...this.accessFilter(actorId, scope) },
      update,
      { new: true, runValidators: true }
    );
  }

  async softDeleteScoped(id: string, actorId: string, scope: ResourceVisibilityScope): Promise<IProject | null> {
    return Project.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, ...this.accessFilter(actorId, scope) },
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
      Project.find(query).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Project.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }
}

export const projectRepository = new ProjectRepository();
