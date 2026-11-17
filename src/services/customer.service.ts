import { FilterQuery } from 'mongoose';
import { customerRepository } from '../repositories/CustomerRepository';
import { ICustomer } from '../models/Customer.model';
import { AppError } from '../utils/AppError';
import { multiWordSearch } from '../utils/escapeRegex';

class CustomerService {
  async create(data: Omit<Partial<ICustomer>, 'createdBy'>, actorId: string) {
    return customerRepository.create({ ...data, createdBy: actorId as never });
  }
  async list(filters: { search?: string; type?: string; currency?: string }, page = 1, limit = 20) {
    const query: FilterQuery<ICustomer> = {};
    if (filters.type) query.customerType = filters.type;
    if (filters.currency) query.currency = filters.currency.toUpperCase();
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['primaryContactName','companyName','email','contactNumber','vatNumber']));
    return customerRepository.list(query, page, limit);
  }
  async getById(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) throw AppError.notFound('Customer not found');
    return customer;
  }
  async update(id: string, data: Partial<ICustomer>) {
    const current = await this.getById(id);
    if (data.customerType === 'individual') data.companyName = undefined;
    const updated = await customerRepository.updateById(current._id, data);
    if (!updated) throw AppError.notFound('Customer not found');
    return updated;
  }
  async remove(id: string) {
    const current = await this.getById(id);
    await customerRepository.softDeleteById(current._id);
  }
}
export const customerService = new CustomerService();
