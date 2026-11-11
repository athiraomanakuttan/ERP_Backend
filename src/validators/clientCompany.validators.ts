import { z } from 'zod';
import { descriptionField, entityName, personName, phoneNumber } from './common.validators';

export const createClientCompanySchema = z.object({
  companyName: entityName('Company name', 3, 120),
  contactPerson: personName('Contact person', false),
  phone: phoneNumber('Phone number', false),
  status: z.enum(['active', 'inactive']).optional(),
  notes: descriptionField('Notes', 1000),
});
export const updateClientCompanySchema = createClientCompanySchema.partial();
