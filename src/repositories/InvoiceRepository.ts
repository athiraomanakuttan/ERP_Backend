import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { Invoice, IInvoice } from '../models/Invoice.model';

class InvoiceRepository extends BaseRepository<IInvoice> {
  constructor() { super(Invoice); }
  async list(filter: FilterQuery<IInvoice>, page = 1, limit = 20) {
    const query = { ...filter, isDeleted: { $ne: true } } as FilterQuery<IInvoice>;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Invoice.find(query).populate('customer').sort('-createdAt').skip(skip).limit(limit),
      Invoice.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }
  async findPopulatedById(id: string) {
    return Invoice.findOne({ _id: id, isDeleted: { $ne: true } }).populate('customer');
  }
}
export const invoiceRepository = new InvoiceRepository();
