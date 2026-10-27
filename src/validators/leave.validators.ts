import { z } from 'zod';
import { descriptionField, entityName, objectId } from './common.validators';

export const createLeaveTypeSchema = z.object({
  name: entityName('Leave type name', 3, 80),
  defaultDaysPerYear: z.number().int('Leave days must be a whole number').min(0, 'Leave days cannot be negative').max(366, 'Leave days cannot exceed 366'),
  description: descriptionField('Description', 500),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Provide at least one field to update',
});

export const createLeaveRequestSchema = z
  .object({
    leaveType: objectId('Leave type'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: descriptionField('Reason', 500),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  decisionNote: descriptionField('Decision note', 500),
});
