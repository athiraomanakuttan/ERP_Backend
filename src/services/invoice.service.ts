import { FilterQuery } from 'mongoose';
import { invoiceRepository } from '../repositories/InvoiceRepository';
import { invoiceCounterRepository } from '../repositories/InvoiceCounterRepository';
import { customerService } from './customer.service';
import { settingsService } from './settings.service';
import { IInvoice, InvoiceStatus } from '../models/Invoice.model';
import { AppError } from '../utils/AppError';
import { calculateInvoice, InvoiceInputItem, roundMoney } from '../utils/invoiceMath';
import { multiWordSearch } from '../utils/escapeRegex';
import { serviceCategoryService } from './serviceCategory.service';

type InvoicePayloadItem = Omit<InvoiceInputItem, 'itemName'> & { categoryId: string };

interface InvoicePayload {
  customer: string;
  invoiceNumber: string;
  orderNumber?: string;
  invoiceDate: Date;
  terms: IInvoice['terms'];
  dueDate: Date;
  salesPerson: string;
  subject: string;
  items: InvoicePayloadItem[];
}

class InvoiceService {
  async reserveNextNumber() {
    const year = new Date().getFullYear();
    const sequence = await invoiceCounterRepository.reserve(year);
    return `INV-${year}-${String(sequence).padStart(4, '0')}`;
  }

  async create(payload: InvoicePayload, actorId: string) {
    const [customer, settings] = await Promise.all([customerService.getById(payload.customer), settingsService.get()]);
    if (!settings.companyVatNumber || !settings.companyBankName || !settings.companyBankAccountNumber || !settings.companyBankBranch) {
      throw AppError.badRequest('Configure Company VAT Number, Bank Name, Bank Account Number and Bank Branch in Invoice Settings before creating an invoice');
    }
    const vatPercent = settings.defaultVatPercent ?? 5;
    const items = await Promise.all(payload.items.map(async (item) => {
      if (!item.categoryId) throw AppError.badRequest('Select a category for every invoice item');
      const category = await serviceCategoryService.getById(item.categoryId);
      return { ...item, category: category._id, categoryName: category.name, itemName: category.name };
    }));
    const totals = calculateInvoice(items, vatPercent);
    const duplicate = await invoiceRepository.findOne({ invoiceNumber: payload.invoiceNumber } as FilterQuery<IInvoice>);
    if (duplicate) throw AppError.conflict('Invoice number already exists');
    return invoiceRepository.create({
      ...payload,
      customer: customer._id,
      customerName: customer.customerType === 'business' ? (customer.companyName || customer.primaryContactName) : customer.primaryContactName,
      customerEmail: customer.email,
      customerVatNumber: customer.vatNumber,
      currency: customer.currency,
      companyName: settings.companyName,
      companyVatNumber: settings.companyVatNumber,
      companyBankName: settings.companyBankName,
      companyBankAccountNumber: settings.companyBankAccountNumber,
      companyBankBranch: settings.companyBankBranch,
      invoiceLogoDataUrl: settings.invoiceLogoDataUrl || settings.logoDataUrl,
      vatPercent,
      items: totals.items,
      subtotal: totals.subtotal,
      totalBeforeVat: totals.totalBeforeVat,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,
      amountPaid: 0,
      balanceDue: totals.grandTotal,
      status: 'draft',
      createdBy: actorId as never,
    });
  }

  async list(filters: { search?: string; customer?: string; status?: InvoiceStatus; paymentState?: 'pending' | 'completed'; fromDate?: string; toDate?: string; sortBy?: 'dueDate'|'invoiceDate'|'amount'|'createdAt'; sortOrder?: 'asc'|'desc' }, page = 1, limit = 20) {
    const query: FilterQuery<IInvoice> = {};
    if (filters.customer) query.customer = filters.customer as never;
    if (filters.status) query.status = filters.status;
    if (filters.paymentState === 'pending') query.status = { $in: ['issued', 'partially_paid'] };
    if (filters.paymentState === 'completed') query.status = 'paid';
    if (filters.search) Object.assign(query, multiWordSearch(filters.search, ['invoiceNumber','customerName','subject','orderNumber']));
    if (filters.fromDate || filters.toDate) {
      query.invoiceDate = {};
      if (filters.fromDate) (query.invoiceDate as any).$gte = new Date(filters.fromDate);
      if (filters.toDate) { const end = new Date(filters.toDate); end.setHours(23,59,59,999); (query.invoiceDate as any).$lte = end; }
    }
    let sort = '-createdAt';
    if (filters.sortBy) {
      const sortField = filters.sortBy === 'invoiceDate' ? 'invoiceDate' : filters.sortBy === 'amount' ? 'grandTotal' : filters.sortBy === 'createdAt' ? 'createdAt' : 'dueDate';
      sort = `${filters.sortOrder === 'desc' ? '-' : ''}${sortField}`;
    }
    return invoiceRepository.list(query, page, limit, sort);
  }

  async categoryReport(filters: { fromDate?: string; toDate?: string; category?: string; currency?: string; sortBy?: 'amount'|'orderCount'|'category'; sortOrder?: 'asc'|'desc' }) {
    const match: Record<string, any> = {};
    if (filters.fromDate || filters.toDate) {
      match.invoiceDate = {};
      if (filters.fromDate) match.invoiceDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) { const end = new Date(filters.toDate); end.setHours(23,59,59,999); match.invoiceDate.$lte = end; }
    }
    if (filters.currency) match.currency = filters.currency.toUpperCase();
    const rows = await invoiceRepository.categoryReport(match, filters.category, filters.sortBy ?? 'amount', filters.sortOrder ?? 'desc');
    return {
      rows,
      totals: {
        orderCount: rows.reduce((sum: number, x: any) => sum + Number(x.orderCount || 0), 0),
        amountsByCurrency: rows.reduce((acc: Record<string, number>, x: any) => { const key = x.currency || 'N/A'; acc[key] = roundMoney((acc[key] || 0) + Number(x.amount || 0)); return acc; }, {})
      }
    };
  }

  async getById(id: string) {
    const invoice = await invoiceRepository.findPopulatedById(id);
    if (!invoice) throw AppError.notFound('Invoice not found');
    return invoice;
  }

  async update(id: string, payload: Partial<InvoicePayload>) {
    const invoice = await this.getById(id);
    if (invoice.status !== 'draft') throw AppError.badRequest('Only draft invoices can be edited');
    let customer = null;
    if (payload.customer) customer = await customerService.getById(payload.customer);
    const settings = await settingsService.get();
    const vatPercent = invoice.vatPercent ?? settings.defaultVatPercent ?? 5;
    const sourceItems = payload.items ? await Promise.all(payload.items.map(async (item) => {
      if (!item.categoryId) throw AppError.badRequest('Select a category for every invoice item');
      const category = await serviceCategoryService.getById(item.categoryId);
      return { ...item, category: category._id, categoryName: category.name, itemName: category.name };
    })) : invoice.items.map((x) => ({
      category: x.category, categoryName: x.categoryName, itemName: x.itemName, quantity: x.quantity, rate: x.rate, discountType: x.discountType, discountValue: x.discountValue,
    }));
    const totals = calculateInvoice(sourceItems, vatPercent);
    if (payload.invoiceNumber && payload.invoiceNumber !== invoice.invoiceNumber) {
      const duplicate = await invoiceRepository.findOne({ invoiceNumber: payload.invoiceNumber } as FilterQuery<IInvoice>);
      if (duplicate) throw AppError.conflict('Invoice number already exists');
    }
    const update: any = {
      ...payload,
      items: totals.items,
      subtotal: totals.subtotal,
      totalBeforeVat: totals.totalBeforeVat,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,
      balanceDue: roundMoney(totals.grandTotal - invoice.amountPaid),
    };
    if (customer) {
      update.customer = customer._id;
      update.customerName = customer.customerType === 'business' ? (customer.companyName || customer.primaryContactName) : customer.primaryContactName;
      update.customerEmail = customer.email;
      update.customerVatNumber = customer.vatNumber;
      update.currency = customer.currency;
    }
    const updated = await invoiceRepository.updateById(id, update);
    if (!updated) throw AppError.notFound('Invoice not found');
    return updated;
  }

  async issue(id: string) {
    const invoice = await this.getById(id);
    if (invoice.status !== 'draft') throw AppError.badRequest('Only draft invoices can be issued');
    return invoiceRepository.updateById(id, { status: 'issued', issuedAt: new Date() });
  }

  async cancel(id: string) {
    const invoice = await this.getById(id);
    if (invoice.status === 'paid' || invoice.status === 'partially_paid') throw AppError.badRequest('Paid or partially paid invoices cannot be cancelled');
    return invoiceRepository.updateById(id, { status: 'cancelled', cancelledAt: new Date() });
  }

  async remove(id: string) {
    const invoice = await this.getById(id);
    if (invoice.status !== 'draft' && invoice.status !== 'cancelled') throw AppError.badRequest('Only draft or cancelled invoices can be deleted');
    await invoiceRepository.softDeleteById(id);
  }

  async applyPayment(id: string, amount: number) {
    const invoice = await this.getById(id);
    if (invoice.status === 'cancelled') throw AppError.badRequest('Cancelled invoice cannot receive payment');
    if (amount > invoice.balanceDue + 0.0001) throw AppError.badRequest('Amount received exceeds invoice balance');
    const amountPaid = roundMoney(invoice.amountPaid + amount);
    const balanceDue = roundMoney(Math.max(0, invoice.grandTotal - amountPaid));
    const status: InvoiceStatus = balanceDue <= 0 ? 'paid' : 'partially_paid';
    const updated = await invoiceRepository.updateById(id, { amountPaid, balanceDue, status });
    if (!updated) throw AppError.notFound('Invoice not found');
    return updated;
  }
}
export const invoiceService = new InvoiceService();
