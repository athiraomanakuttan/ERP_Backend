import { serviceCategoryRepository } from '../repositories/ServiceCategoryRepository';
import { AppError } from '../utils/AppError';

const DEFAULT_CATEGORIES = [
  'Consultancy',
  'Branding',
  'Hosting / Domain / SSL',
  'Website Development',
  'Annual Maintenance (AMC)',
  'Content Writing',
  'Social Media Management',
  'Media Buy',
  'Photography / Videography',
  'SEO - Search Engine',
  'Events',
  'Mobile Application',
];

class ServiceCategoryService {
  private async ensureDefaults(actorId?: string) {
    const existing = await serviceCategoryRepository.list();
    if (existing.length) return existing;
    await Promise.all(DEFAULT_CATEGORIES.map((name) => serviceCategoryRepository.create({ name, createdBy: actorId as never })));
    return serviceCategoryRepository.list();
  }

  async list(actorId?: string) { return this.ensureDefaults(actorId); }

  async getById(id: string) {
    const category = await serviceCategoryRepository.findById(id);
    if (!category) throw AppError.notFound('Category not found');
    return category;
  }

  async create(name: string, actorId: string) {
    const duplicate = await serviceCategoryRepository.findByName(name.trim());
    if (duplicate) throw AppError.conflict('Category already exists');
    return serviceCategoryRepository.create({ name: name.trim(), createdBy: actorId as never });
  }

  async update(id: string, name: string) {
    await this.getById(id);
    const duplicate = await serviceCategoryRepository.findByName(name.trim());
    if (duplicate && String(duplicate._id) !== id) throw AppError.conflict('Category already exists');
    const updated = await serviceCategoryRepository.updateById(id, { name: name.trim() });
    if (!updated) throw AppError.notFound('Category not found');
    return updated;
  }

  async remove(id: string) {
    await this.getById(id);
    await serviceCategoryRepository.softDeleteById(id);
  }
}
export const serviceCategoryService = new ServiceCategoryService();
