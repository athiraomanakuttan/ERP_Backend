import { z } from 'zod';

export const PERSON_NAME_REGEX = /^[\p{L}' -]+$/u;
export const PHONE_REGEX = /^\+?\d{7,15}$/;
export const SIMPLE_LABEL_REGEX = /^[\p{L}\p{N}&()'.,/+#:_ -]+$/u;
export const EMPLOYEE_CODE_REGEX = /^[A-Za-z0-9_-]{2,30}$/;

export const personName = (label: string, required = true) => {
  const schema = z
    .string()
    .trim()
    .min(3, `${label} must be at least 3 characters`)
    .max(60, `${label} must be 60 characters or fewer`)
    .regex(PERSON_NAME_REGEX, `${label} can contain letters, spaces, apostrophes and hyphens only`);
  return required ? schema : schema.optional().or(z.literal(''));
};

export const entityName = (label: string, min = 3, max = 100) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`)
    .regex(SIMPLE_LABEL_REGEX, `${label} contains unsupported characters`);

export const phoneNumber = (label = 'Phone number', required = true) => {
  const schema = z
    .string()
    .trim()
    .regex(PHONE_REGEX, `${label} must contain only digits, with an optional leading +, and be 7 to 15 digits long`);
  return required ? schema : schema.optional().or(z.literal(''));
};

export const emailAddress = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(120, 'Email must be 120 characters or fewer')
  .email('Enter a valid email address');

export const addressField = z
  .string()
  .trim()
  .min(5, 'Address must be at least 5 characters')
  .max(250, 'Address must be 250 characters or fewer');

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const descriptionField = (label = 'Description', max = 1000) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional().or(z.literal(''));

export const employeeCode = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value === '' ? undefined : value))
  .refine(
    (value) => value === undefined || EMPLOYEE_CODE_REGEX.test(value),
    'Employee code may contain only letters, numbers, hyphens and underscores (2-30 characters)'
  );

export const objectId = (label = 'ID') => z.string().regex(/^[a-fA-F0-9]{24}$/, `${label} is invalid`);

/** Treat blank HTML form values as omitted for optional typed fields. */
export const emptyStringToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const optionalDate = () =>
  z.preprocess(emptyStringToUndefined, z.coerce.date().optional());

export const optionalObjectId = (label = 'ID') =>
  z.preprocess(emptyStringToUndefined, objectId(label).optional());

