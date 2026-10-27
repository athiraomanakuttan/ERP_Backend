import { BaseRepository } from './BaseRepository';
import { Holiday, IHoliday } from '../models/Holiday.model';

export class HolidayRepository extends BaseRepository<IHoliday> {
  constructor() {
    super(Holiday);
  }

  async findByBranch(branchId: string): Promise<IHoliday[]> {
    return Holiday.find({ branches: branchId, isDeleted: { $ne: true } }).sort('date');
  }

  async findUpcoming(limit = 5): Promise<IHoliday[]> {
    return Holiday.find({ date: { $gte: new Date() }, isDeleted: { $ne: true } }).sort('date').limit(limit);
  }

  /** Populated, paginated listing for the admin management screen. */
  async paginatePopulated(
    filter: Record<string, unknown>,
    { page = 1, limit = 20, sort = 'date' }: { page?: number; limit?: number; sort?: string }
  ) {
    const query = { ...filter, isDeleted: { $ne: true } };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Holiday.find(query).sort(sort).skip(skip).limit(limit).populate({ path: 'branches', select: 'name' }),
      Holiday.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }
}

export const holidayRepository = new HolidayRepository();
