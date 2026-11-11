import { z } from 'zod';
import { objectId, phoneNumber } from './common.validators';
export const invoiceFollowUpBodySchema = z.object({
  followUpDate: z.coerce.date(),
  message: z.string().trim().min(2, 'Follow-up message is required').max(1000),
  contactPerson: z.string().trim().min(2).max(120).optional(),
  contactNumber: phoneNumber('Contact number').optional(),
});
export const invoiceFollowUpInvoiceParamSchema = z.object({ invoiceId: objectId('Invoice ID') });
export const invoiceFollowUpIdParamSchema = z.object({ id: objectId('Follow-up ID') });
