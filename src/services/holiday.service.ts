import { holidayRepository } from '../repositories/HolidayRepository';
import { AppError } from '../utils/AppError';

export class HolidayService {
  async create(data: Record<string, unknown>) {
    return holidayRepository.create(data as never);
  }
  async list(filters: { branch?: string; from?: Date; to?: Date }, pagination: { page?: number; limit?: number }) {
    const query: Record<string, unknown> = {};
    if (filters.branch) query.branches = filters.branch;
    if (filters.from || filters.to) {
      query.date = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }
    return holidayRepository.paginatePopulated(query, pagination);
  }
  async listByBranch(branchId: string) {
    return holidayRepository.findByBranch(branchId);
  }
  async upcoming(limit = 5) {
    return holidayRepository.findUpcoming(limit);
  }
  async update(id: string, data: Record<string, unknown>) {
    const holiday = await holidayRepository.updateById(id, data as never);
    if (!holiday) throw AppError.notFound('Holiday not found');
    return holiday;
  }
  async remove(id: string) {
    const result = await holidayRepository.softDeleteById(id);
    if (!result) throw AppError.notFound('Holiday not found');
  }
}
export const holidayService = new HolidayService();
