import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { Customer, ICustomer } from '../models/Customer.model';

class CustomerRepository extends BaseRepository<ICustomer> {
  constructor() { super(Customer); }
  async list(filter: FilterQuery<ICustomer>, page = 1, limit = 20) {
    return this.paginate(filter, { page, limit, sort: '-createdAt' });
  }
}
export const customerRepository = new CustomerRepository();
