import { BaseRepository } from './BaseRepository';
import { InvoiceFollowUp, IInvoiceFollowUp } from '../models/InvoiceFollowUp.model';

class InvoiceFollowUpRepository extends BaseRepository<IInvoiceFollowUp> {
  constructor() { super(InvoiceFollowUp); }
  async listByInvoice(invoiceId: string) {
    return InvoiceFollowUp.find({ invoice: invoiceId, isDeleted: { $ne: true } })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
  }
}
export const invoiceFollowUpRepository = new InvoiceFollowUpRepository();
