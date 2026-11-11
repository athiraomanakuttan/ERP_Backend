import { z } from 'zod';
import { objectId } from './common.validators';

const manualBase = z.object({
  taskId: objectId('Task'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  reason: z.string().trim().min(5, 'Reason must contain at least 5 characters').max(500, 'Reason cannot exceed 500 characters'),
});

export const createManualWorkSessionSchema = manualBase.extend({
  employeeId: objectId('Employee'),
}).refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const createSelfManualWorkSessionSchema = manualBase.refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});
