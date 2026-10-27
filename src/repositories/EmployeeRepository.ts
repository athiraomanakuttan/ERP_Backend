import { FilterQuery, UpdateQuery } from 'mongoose';
import { multiWordSearch } from '../utils/escapeRegex';
import { BaseRepository } from './BaseRepository';
import { Employee, IEmployee } from '../models/Employee.model';
import { EmployeeVisibilityScope } from '../utils/employeeAccess';

const POPULATE_FIELDS = [
  { path: 'role', select: 'name' },
  { path: 'branch', select: 'name timezone' },
  { path: 'reportingManager', select: 'firstName lastName email' },
  { path: 'teamLead', select: 'firstName lastName email' },
];

export class EmployeeRepository extends BaseRepository<IEmployee> {
  constructor() {
    super(Employee);
  }

  /** Includes passwordHash - use only for authentication flows. */
  async findByEmailWithPassword(email: string): Promise<IEmployee | null> {
    return Employee.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } }).select('+passwordHash');
  }

  async findByEmail(email: string): Promise<IEmployee | null> {
    return Employee.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
  }

  /** Build the mandatory employee-access filter for the current actor. */
  accessFilter(actorId: string, scope: EmployeeVisibilityScope): FilterQuery<IEmployee> {
    if (scope === 'admin') return {};
    // Admin employee records are protected from every non-admin visibility scope.
    if (scope === 'all') return { isAdmin: { $ne: true } } as FilterQuery<IEmployee>;
    if (scope === 'assigned') {
      return {
        isAdmin: { $ne: true },
        $or: [{ reportingManager: actorId }, { teamLead: actorId }],
      } as FilterQuery<IEmployee>;
    }
    // Impossible-to-match filter for actors with no employee visibility scope.
    return { _id: null } as unknown as FilterQuery<IEmployee>;
  }

  async searchActiveScoped(query: string, actorId: string, scope: EmployeeVisibilityScope, limit = 20): Promise<IEmployee[]> {
    return Employee.find({
      ...this.accessFilter(actorId, scope),
      isDeleted: { $ne: true },
      status: 'active',
      ...multiWordSearch(query, ['firstName', 'lastName', 'email', 'employeeCode']),
    }).limit(limit);
  }

  async findAdmin(): Promise<IEmployee | null> {
    return Employee.findOne({ isAdmin: true, isDeleted: { $ne: true } });
  }

  /** Populated variant for API responses. */
  async findByIdPopulated(id: string): Promise<IEmployee | null> {
    return Employee.findOne({ _id: id, isDeleted: { $ne: true } }).populate(POPULATE_FIELDS);
  }

  async findByIdPopulatedScoped(
    id: string,
    actorId: string,
    scope: EmployeeVisibilityScope
  ): Promise<IEmployee | null> {
    return Employee.findOne({
      _id: id,
      isDeleted: { $ne: true },
      ...this.accessFilter(actorId, scope),
    }).populate(POPULATE_FIELDS);
  }

  async paginatePopulated(
    filter: Record<string, unknown>,
    { page = 1, limit = 20, sort = '-createdAt' }: { page?: number; limit?: number; sort?: string }
  ) {
    const query = { ...filter, isDeleted: { $ne: true } };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Employee.find(query).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Employee.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findActiveRefsScoped(actorId: string, scope: EmployeeVisibilityScope): Promise<IEmployee[]> {
    return Employee.find({
      ...this.accessFilter(actorId, scope),
      isDeleted: { $ne: true },
      status: 'active',
    }).select('firstName lastName email').sort({ firstName: 1, lastName: 1 });
  }

  async findIdsScoped(actorId: string, scope: EmployeeVisibilityScope): Promise<string[]> {
    const employees = await Employee.find({
      ...this.accessFilter(actorId, scope),
      isDeleted: { $ne: true },
    }).select('_id');
    return employees.map((employee) => employee._id.toString());
  }

  async updateScoped(
    id: string,
    actorId: string,
    scope: EmployeeVisibilityScope,
    update: UpdateQuery<IEmployee>
  ): Promise<IEmployee | null> {
    return Employee.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, ...this.accessFilter(actorId, scope) },
      update,
      { new: true, runValidators: true }
    );
  }

  async softDeleteScoped(id: string, actorId: string, scope: EmployeeVisibilityScope): Promise<IEmployee | null> {
    return Employee.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, ...this.accessFilter(actorId, scope) },
      { isDeleted: true },
      { new: true }
    );
  }
}

export const employeeRepository = new EmployeeRepository();
