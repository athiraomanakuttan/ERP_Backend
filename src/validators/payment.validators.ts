import { z } from 'zod';
import { objectId, emptyStringToUndefined } from './common.validators';

const optionalText = (max: number) => z.preprocess(emptyStringToUndefined, z.string().trim().max(max).optional());

export const paymentCreateSchema = z.object({
  invoice: objectId('Invoice ID'),
  paymentId: z.string().trim().min(2).max(80),
  amountReceived: z.coerce.number().positive('Amount received must be greater than zero'),
  bankCharges: z.coerce.number().min(0, 'Bank charges cannot be negative').default(0),
  paymentDate: z.coerce.date(),
  paymentMode: z.enum(['cash', 'bank_remittance', 'bank_transfer', 'cheque']),
  paymentReceivedOn: z.coerce.date(),
  depositedTo: optionalText(120),
  referenceId: optionalText(120),
  notes: optionalText(1000),
  attachmentName: optionalText(180),
  attachmentDataUrl: z.preprocess(emptyStringToUndefined, z.string().max(7_000_000).optional()),
});
export const paymentIdParamSchema = z.object({ id: objectId('Payment ID') });
export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  invoice: objectId('Invoice ID').optional(),
  customer: objectId('Customer ID').optional(),
  search: z.string().trim().optional(),
  paymentMode: z.enum(['cash', 'bank_remittance', 'bank_transfer', 'cheque']).optional(),
  fromDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid from date').optional(),
  toDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid to date').optional(),
});
