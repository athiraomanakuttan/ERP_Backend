import { multiWordSearch } from '../utils/escapeRegex';
import { clientCompanyRepository } from '../repositories/ClientCompanyRepository';
import { AppError } from '../utils/AppError';
import { notificationService } from './notification.service';
import { employeeRepository } from '../repositories/EmployeeRepository';

export class ClientCompanyService {
  async create(data: Record<string, unknown>, createdBy: string) {
    const company = await clientCompanyRepository.create(data as never);
    // Notify Admin(s) of client company creation (spec section 15)
    const admin = await employeeRepository.findAdmin();
    if (admin && admin._id.toString() !== createdBy) {
      await notificationService.notify(admin._id.toString(), 'client_company_created', {
        title: 'New client company created',
        message: `${company.companyName} was added as a client company.`,
        relatedEntityType: 'ClientCompany',
        relatedEntityId: company._id.toString(),
      });
    }
    return company;
  }
  async list(filters: { search?: string; status?: string }, pagination: { page?: number; limit?: number }) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['companyName', 'contactPerson', 'phone']));
    return clientCompanyRepository.paginate(query, pagination);
  }
  async getById(id: string) {
    const company = await clientCompanyRepository.findById(id);
    if (!company) throw AppError.notFound('Client company not found');
    return company;
  }
  async update(id: string, data: Record<string, unknown>) {
    const company = await clientCompanyRepository.updateById(id, data as never);
    if (!company) throw AppError.notFound('Client company not found');
    return company;
  }
  async remove(id: string) {
    const result = await clientCompanyRepository.softDeleteById(id);
    if (!result) throw AppError.notFound('Client company not found');
  }
}
export const clientCompanyService = new ClientCompanyService();
