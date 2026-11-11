import { invoiceFollowUpRepository } from '../repositories/InvoiceFollowUpRepository';
import { invoiceService } from './invoice.service';
import { customerService } from './customer.service';
import { AppError } from '../utils/AppError';

interface FollowUpPayload {
  followUpDate: Date;
  message: string;
  contactPerson?: string;
  contactNumber?: string;
}

class InvoiceFollowUpService {
  async list(invoiceId: string) {
    await invoiceService.getById(invoiceId);
    return invoiceFollowUpRepository.listByInvoice(invoiceId);
  }

  async create(invoiceId: string, payload: FollowUpPayload, actorId: string) {
    const invoice = await invoiceService.getById(invoiceId);
    const customerId = typeof invoice.customer === 'object' && '_id' in (invoice.customer as any)
      ? String((invoice.customer as any)._id)
      : String(invoice.customer);
    const customer = await customerService.getById(customerId);
    const contactPerson = payload.contactPerson?.trim() || customer.primaryContactName;
    const contactNumber = payload.contactNumber?.trim() || customer.contactNumber;
    if (!contactPerson || !contactNumber) throw AppError.badRequest('Contact person and contact number are required');
    return invoiceFollowUpRepository.create({
      invoice: invoice._id,
      customer: customer._id,
      followUpDate: payload.followUpDate,
      message: payload.message.trim(),
      contactPerson,
      contactNumber,
      createdBy: actorId as never,
    });
  }

  async remove(id: string) {
    const item = await invoiceFollowUpRepository.findById(id);
    if (!item) throw AppError.notFound('Follow-up not found');
    await invoiceFollowUpRepository.softDeleteById(id);
  }
}
export const invoiceFollowUpService = new InvoiceFollowUpService();
