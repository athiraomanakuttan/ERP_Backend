import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { Payment, IPayment } from '../models/Payment.model';

class PaymentRepository extends BaseRepository<IPayment> {
  constructor() { super(Payment); }
  async list(filter: FilterQuery<IPayment>, page = 1, limit = 20) {
    const query = { ...filter, isDeleted: { $ne: true } } as FilterQuery<IPayment>;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Payment.find(query).populate('invoice').populate('customer').sort('-paymentDate').skip(skip).limit(limit),
      Payment.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }
}
export const paymentRepository = new PaymentRepository();
