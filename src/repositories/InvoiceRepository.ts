import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { Invoice, IInvoice } from '../models/Invoice.model';

class InvoiceRepository extends BaseRepository<IInvoice> {
  constructor() { super(Invoice); }
  async list(filter: FilterQuery<IInvoice>, page = 1, limit = 20, sort = '-createdAt') {
    const query = { ...filter, isDeleted: { $ne: true } } as FilterQuery<IInvoice>;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Invoice.find(query).populate('customer').sort(sort).skip(skip).limit(limit),
      Invoice.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async categoryReport(match: Record<string, any>, category?: string, sortBy: 'amount'|'orderCount'|'category' = 'amount', sortOrder: 'asc'|'desc' = 'desc') {
    const categoryMatch = category ? [{ $match: { category } }] : [];
    const sortField = sortBy === 'orderCount' ? 'orderCount' : sortBy === 'category' ? 'category' : 'amount';
    const direction = sortOrder === 'asc' ? 1 : -1;

    return Invoice.aggregate([
      { $match: { ...match, isDeleted: { $ne: true }, status: { $in: ['issued', 'partially_paid', 'paid'] } } },
      { $unwind: '$items' },
      {
        $project: {
          invoiceId: '$_id',
          invoiceNumber: 1,
          orderNumber: 1,
          customerName: 1,
          invoiceDate: 1,
          dueDate: 1,
          status: 1,
          subject: 1,
          currency: 1,
          category: { $ifNull: ['$items.categoryName', '$items.itemName'] },
          quantity: '$items.quantity',
          amount: '$items.total',
        },
      },
      ...categoryMatch,
      {
        $group: {
          _id: { category: '$category', currency: '$currency', invoiceId: '$invoiceId' },
          invoiceNumber: { $first: '$invoiceNumber' },
          orderNumber: { $first: '$orderNumber' },
          customerName: { $first: '$customerName' },
          invoiceDate: { $first: '$invoiceDate' },
          dueDate: { $first: '$dueDate' },
          status: { $first: '$status' },
          subject: { $first: '$subject' },
          quantity: { $sum: '$quantity' },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { invoiceDate: -1, invoiceNumber: -1 } },
      {
        $group: {
          _id: { category: '$_id.category', currency: '$_id.currency' },
          orderCount: { $sum: 1 },
          amount: { $sum: '$amount' },
          orders: {
            $push: {
              invoiceId: '$_id.invoiceId',
              invoiceNumber: '$invoiceNumber',
              orderNumber: '$orderNumber',
              customerName: '$customerName',
              invoiceDate: '$invoiceDate',
              dueDate: '$dueDate',
              status: '$status',
              subject: '$subject',
              quantity: '$quantity',
              amount: '$amount',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          currency: '$_id.currency',
          orderCount: 1,
          amount: 1,
          orders: 1,
        },
      },
      { $sort: { [sortField]: direction, category: 1 } as any },
    ]);
  }

  async findPopulatedById(id: string) {
    return Invoice.findOne({ _id: id, isDeleted: { $ne: true } }).populate('customer');
  }
}
export const invoiceRepository = new InvoiceRepository();
