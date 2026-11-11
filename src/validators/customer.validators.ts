import { z } from 'zod';
import { personName, phoneNumber, emailAddress, objectId, emptyStringToUndefined } from './common.validators';

const optionalTrimmed = (max: number, label: string) => z.preprocess(
  emptyStringToUndefined,
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional()
);

export const customerSchema = z.object({
  customerType: z.enum(['individual', 'business']),
  primaryContactName: personName('Primary contact'),
  contactNumber: phoneNumber('Contact number'),
  companyName: optionalTrimmed(120, 'Company name'),
  email: emailAddress,
  vatNumber: z.string().trim().min(1, 'VAT number is required').max(60, 'VAT number must be 60 characters or fewer'),
  currency: z.string().trim().length(3, 'Currency must be a 3-letter ISO code').transform((v) => v.toUpperCase()),
}).superRefine((data, ctx) => {
  if (data.customerType === 'business' && !data.companyName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['companyName'], message: 'Company name is required for a business customer' });
  }
});

export const customerUpdateSchema = customerSchema;
export const customerIdParamSchema = z.object({ id: objectId('Customer ID') });
export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  type: z.enum(['individual', 'business']).optional(),
  currency: z.string().trim().length(3).optional(),
});
