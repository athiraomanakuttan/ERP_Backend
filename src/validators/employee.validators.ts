import { z } from 'zod';
import {
  addressField,
  emailAddress,
  employeeCode,
  entityName,
  objectId,
  optionalObjectId,
  emptyStringToUndefined,
  passwordField,
  personName,
  phoneNumber,
} from './common.validators';

const emergencyContactSchema = z
  .object({
    name: personName('Emergency contact name', false),
    phone: phoneNumber('Emergency contact phone', false),
    relation: entityName('Relationship', 2, 40).optional().or(z.literal('')),
  })
  .optional();

export const createEmployeeSchema = z.object({
  firstName: personName('First name'),
  lastName: personName('Last name', false),
  dateOfBirth: z.coerce.date().refine((d) => d < new Date(), 'Date of birth must be in the past'),
  gender: z.preprocess(emptyStringToUndefined, z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional()),
  phone: phoneNumber('Phone number'),
  email: emailAddress,
  address: addressField,
  employeeCode,
  joiningDate: z.coerce.date(),
  department: entityName('Department', 2, 80).optional().or(z.literal('')),
  role: objectId('Role'),
  branch: objectId('Branch'),
  reportingManager: optionalObjectId('Reporting manager'),
  teamLead: optionalObjectId('Team lead'),
  emergencyContact: emergencyContactSchema,
  initialPassword: passwordField,
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ initialPassword: true });

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  branch: optionalObjectId('Branch'),
  role: optionalObjectId('Role'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const idParamSchema = z.object({ id: objectId() });
