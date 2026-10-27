import { z } from 'zod';
import { entityName, emptyStringToUndefined } from './common.validators';

const optionalImage = z.string()
  .regex(/^data:image\/(png|jpeg|jpg|svg\+xml|webp);base64,/, 'Logo must be a PNG, JPEG, WEBP or SVG image')
  .max(4_000_000, 'Logo file is too large - please use an image under 2MB')
  .optional().or(z.literal(''));
const optionalInvoiceImage = z.string()
  .regex(/^data:image\/(png|jpeg|jpg);base64,/, 'Invoice logo must be PNG or JPEG')
  .max(4_000_000, 'Invoice logo is too large - please use an image under 2MB')
  .optional().or(z.literal(''));

export const updateSettingsSchema = z.object({
  companyName: entityName('Company name', 2, 120).optional(),
  logoDataUrl: optionalImage,
  themeColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/, 'Theme color must be a hex value like #4F46E5').optional(),
  companyVatNumber: z.preprocess(emptyStringToUndefined, z.string().trim().max(80).optional()),
  companyBankName: z.preprocess(emptyStringToUndefined, z.string().trim().max(120).optional()),
  companyBankAccountNumber: z.preprocess(emptyStringToUndefined, z.string().trim().max(120).optional()),
  companyBankBranch: z.preprocess(emptyStringToUndefined, z.string().trim().max(120).optional()),
  invoiceLogoDataUrl: optionalInvoiceImage,
  defaultVatPercent: z.coerce.number().min(0).max(100).optional(),
  defaultSalesPerson: z.preprocess(emptyStringToUndefined, z.string().trim().min(2).max(100).optional()),
  defaultCurrency: z.string().trim().length(3).transform((v) => v.toUpperCase()).optional(),
});
