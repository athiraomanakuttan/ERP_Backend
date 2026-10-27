import { multiWordSearch } from '../utils/escapeRegex';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { PaginationParams } from '../repositories/BaseRepository';
import { AppError } from '../utils/AppError';
import { IEmployee } from '../models/Employee.model';
import { EmployeeAccessContext, getEmployeeVisibilityScope } from '../utils/employeeAccess';

export interface CreateEmployeeInput {
  firstName: string;
  lastName?: string;
  dateOfBirth: Date;
  gender?: string;
  phone: string;
  email: string;
  address: string;
  employeeCode?: string;
  joiningDate: Date;
  department?: string;
  role: string;
  branch: string;
  reportingManager?: string;
  teamLead?: string;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  initialPassword: string;
}

export class EmployeeService {
  async create(input: CreateEmployeeInput): Promise<IEmployee> {
    const existing = await employeeRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An employee with this email already exists');
    }

    const { initialPassword, ...rest } = input;
    return employeeRepository.create({
      ...rest,
      passwordHash: initialPassword,
      status: 'active',
    } as unknown as Partial<IEmployee>);
  }

  async list(
    actor: EmployeeAccessContext,
    filters: { search?: string; branch?: string; role?: string; status?: string },
    pagination: PaginationParams
  ) {
    const scope = getEmployeeVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view employees');

    const query: Record<string, unknown> = {
      ...employeeRepository.accessFilter(actor.id, scope),
    };
    if (filters.branch) query.branch = filters.branch;
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      Object.assign(query, multiWordSearch(filters.search, ['firstName', 'lastName', 'email', 'employeeCode']));
    }
    return employeeRepository.paginatePopulated(query, pagination);
  }

  async getById(actor: EmployeeAccessContext, id: string): Promise<IEmployee> {
    const scope = getEmployeeVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view employees');
    const employee = await employeeRepository.findByIdPopulatedScoped(id, actor.id, scope);
    if (!employee) throw AppError.notFound('Employee not found');
    return employee;
  }

  async update(actor: EmployeeAccessContext, id: string, updates: Partial<CreateEmployeeInput>): Promise<IEmployee> {
    const scope = getEmployeeVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this employee');

    // Role assignment is an Admin-only operation. Employee edit permission must never grant role escalation.
    if (!actor.isAdmin && updates.role !== undefined) {
      throw AppError.forbidden('Only Admin can change an employee role');
    }

    if (updates.email) {
      const existing = await employeeRepository.findByEmail(updates.email);
      if (existing && existing._id.toString() !== id) {
        throw AppError.conflict('Another employee already uses this email');
      }
    }

    const employee = await employeeRepository.updateScoped(id, actor.id, scope, updates as never);
    if (!employee) throw AppError.notFound('Employee not found');
    return (await employeeRepository.findByIdPopulated(id))!;
  }

  /** Deactivating blocks login; historical data is preserved (spec section 4 & 21). */
  async setStatus(actor: EmployeeAccessContext, id: string, status: 'active' | 'inactive'): Promise<IEmployee> {
    const scope = getEmployeeVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this employee');
    if (actor.id === id) {
      throw AppError.forbidden('You cannot change your own account status');
    }
    const employee = await employeeRepository.updateScoped(id, actor.id, scope, { status });
    if (!employee) throw AppError.notFound('Employee not found');
    return employee;
  }

  /** Soft delete - historical records referencing this employee remain intact. */
  async softDelete(actor: EmployeeAccessContext, id: string): Promise<void> {
    const scope = getEmployeeVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have access to this employee');
    if (actor.id === id) {
      throw AppError.forbidden('You cannot remove your own account');
    }
    const result = await employeeRepository.softDeleteScoped(id, actor.id, scope);
    if (!result) throw AppError.notFound('Employee not found');
  }

  async search(actor: EmployeeAccessContext, query: string) {
    const scope = getEmployeeVisibilityScope(actor);
    if (scope === 'none') throw AppError.forbidden('You do not have permission to view employees');
    return employeeRepository.searchActiveScoped(query, actor.id, scope);
  }
}

export const employeeService = new EmployeeService();
