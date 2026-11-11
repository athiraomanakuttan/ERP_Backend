import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { IServiceCategory, ServiceCategory } from '../models/ServiceCategory.model';

class ServiceCategoryRepository extends BaseRepository<IServiceCategory> {
  constructor() { super(ServiceCategory); }
  async list() { return ServiceCategory.find({ isDeleted: { $ne: true } }).sort({ name: 1 }); }
  async findByName(name: string) {
    return ServiceCategory.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, isDeleted: { $ne: true } } as FilterQuery<IServiceCategory>);
  }
}
export const serviceCategoryRepository = new ServiceCategoryRepository();
