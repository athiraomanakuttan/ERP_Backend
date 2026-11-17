import { z } from 'zod';
import { objectId, optionalDate } from './common.validators';

export const correctionSchema = z
  .object({
    checkInTime: optionalDate(),
    checkOutTime: optionalDate(),
    correctionReason: z.string().trim().min(5, 'Correction reason must be at least 5 characters').max(500, 'Correction reason must be 500 characters or fewer'),
  })
  .refine((data) => !data.checkInTime || !data.checkOutTime || data.checkOutTime > data.checkInTime, {
    message: 'Check-out time must be after check-in time',
    path: ['checkOutTime'],
  });

export const rangeQuerySchema = z
  .object({
    from: z.string().min(1, 'From date is required'),
    to: z.string().min(1, 'To date is required'),
  })
  .refine((data) => data.to >= data.from, { message: 'To date cannot be before from date', path: ['to'] });

export const teamRangeQuerySchema = z
  .object({
    from: z.string().min(1, 'From date is required'),
    to: z.string().min(1, 'To date is required'),
    employee: objectId('Employee').optional(),
  })
  .refine((data) => data.to >= data.from, { message: 'To date cannot be before from date', path: ['to'] });
