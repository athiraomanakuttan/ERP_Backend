import { FilterQuery } from 'mongoose';
import { paymentRepository } from '../repositories/PaymentRepository';
import { IPayment } from '../models/Payment.model';
import { invoiceService } from './invoice.service';
import { AppError } from '../utils/AppError';
import { roundMoney } from '../utils/invoiceMath';
import { multiWordSearch } from '../utils/escapeRegex';

class PaymentService {
  async create(data: Partial<IPayment> & { invoice: string; amountReceived: number; bankCharges?: number }, actorId: string) {
    const invoice = await invoiceService.getById(data.invoice);
    if (invoice.status === 'draft') throw AppError.badRequest('Issue the invoice before recording payment');
    if (invoice.status === 'paid') throw AppError.badRequest('Invoice is already fully paid');
    const duplicate = await paymentRepository.findOne({ paymentId: data.paymentId } as FilterQuery<IPayment>);
    if (duplicate) throw AppError.conflict('Payment ID already exists');
    const bankCharges = Number(data.bankCharges || 0);
    const netDeposited = roundMoney(data.amountReceived - bankCharges);
    if (netDeposited < 0) throw AppError.badRequest('Bank charges cannot exceed amount received');
    const payment = await paymentRepository.create({
      ...data,
      invoice: invoice._id,
      customer: ((invoice.customer as any)?._id ?? invoice.customer) as never,
      bankCharges,
      netDeposited,
      createdBy: actorId as never,
    });
    await invoiceService.applyPayment(invoice._id.toString(), data.amountReceived);
    return payment;
  }
  async list(filters: { invoice?: string; customer?: string; search?: string; paymentMode?: IPayment['paymentMode']; fromDate?: string; toDate?: string }, page = 1, limit = 20) {
    const query: FilterQuery<IPayment> = {};
    if (filters.invoice) query.invoice = filters.invoice as never;
    if (filters.customer) query.customer = filters.customer as never;
    if (filters.paymentMode) query.paymentMode = filters.paymentMode;
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['paymentId','referenceId','depositedTo','notes']));
    if (filters.fromDate || filters.toDate) {
      query.paymentDate = {};
      if (filters.fromDate) (query.paymentDate as any).$gte = new Date(filters.fromDate);
      if (filters.toDate) { const end = new Date(filters.toDate); end.setHours(23,59,59,999); (query.paymentDate as any).$lte = end; }
    }
    return paymentRepository.list(query, page, limit);
  }
}
export const paymentService = new PaymentService();
