import { z } from 'zod';
import { objectId, emptyStringToUndefined } from './common.validators';

const itemSchema = z.object({
  itemName: z.string().trim().min(2, 'Item name is required').max(160),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
  discountType: z.enum(['percentage', 'amount']).default('percentage'),
  discountValue: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
});

export const invoiceCreateSchema = z.object({
  customer: objectId('Customer ID'),
  invoiceNumber: z.string().trim().min(3).max(60),
  orderNumber: z.preprocess(emptyStringToUndefined, z.string().trim().max(80).optional()),
  invoiceDate: z.coerce.date(),
  terms: z.enum(['due_on_receipt', 'due_end_of_month', 'net_15', 'net_45', 'net_60']),
  dueDate: z.coerce.date(),
  salesPerson: z.string().trim().min(2).max(100),
  subject: z.string().trim().min(2, 'Subject is required').max(300),
  items: z.array(itemSchema).min(1, 'Add at least one invoice item').max(100),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial().extend({
  items: z.array(itemSchema).min(1).max(100).optional(),
});
export const invoiceIdParamSchema = z.object({ id: objectId('Invoice ID') });
export const invoiceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  customer: objectId('Customer ID').optional(),
  status: z.enum(['draft', 'issued', 'partially_paid', 'paid', 'cancelled']).optional(),
  paymentState: z.enum(['pending', 'completed']).optional(),
  fromDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid from date').optional(),
  toDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid to date').optional(),
});
