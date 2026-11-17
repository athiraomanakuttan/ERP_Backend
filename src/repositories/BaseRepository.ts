import { Model, FilterQuery, UpdateQuery, Types, QueryOptions } from 'mongoose';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string; // e.g. '-createdAt'
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Generic repository wrapping a Mongoose model. Concrete repositories extend
 * this for entity-specific queries. Controllers/Services must never touch
 * Mongoose models directly - only through a Repository (see spec section 23).
 */
export class BaseRepository<T extends { isDeleted?: boolean }> {
  constructor(protected readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data as T);
  }

  async findById(id: string | Types.ObjectId, options?: QueryOptions): Promise<T | null> {
    return this.model.findOne({ _id: id, isDeleted: { $ne: true } } as FilterQuery<T>, null, options);
  }

  async findOne(filter: FilterQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model.findOne({ ...filter, isDeleted: { $ne: true } } as FilterQuery<T>, null, options);
  }

  async findMany(filter: FilterQuery<T> = {}, options?: QueryOptions): Promise<T[]> {
    return this.model.find({ ...filter, isDeleted: { $ne: true } } as FilterQuery<T>, null, options);
  }

  async paginate(
    filter: FilterQuery<T> = {},
    { page = 1, limit = 20, sort = '-createdAt' }: PaginationParams = {}
  ): Promise<PaginatedResult<T>> {
    const query = { ...filter, isDeleted: { $ne: true } } as FilterQuery<T>;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateById(id: string | Types.ObjectId, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } } as FilterQuery<T>, update, {
      new: true,
      runValidators: true,
    });
  }

  /** Soft delete - per spec section 21, never hard-delete records with history. */
  async softDeleteById(id: string | Types.ObjectId): Promise<T | null> {
    return this.model.findOneAndUpdate(
      { _id: id } as FilterQuery<T>,
      { isDeleted: true } as UpdateQuery<T>,
      { new: true }
    );
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments({ ...filter, isDeleted: { $ne: true } } as FilterQuery<T>);
  }
}
