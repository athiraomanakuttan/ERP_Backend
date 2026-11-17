import { z } from 'zod';
import { entityName } from './common.validators';

const workingDaySchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  isWorking: z.boolean(),
});
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const branchBaseSchema = z.object({
    name: entityName('Branch name', 3, 100),
    timezone: z.string().trim().min(1, 'Timezone is required').max(100, 'Timezone is too long'),
    workingDays: z.array(workingDaySchema).length(7).refine((days) => days.some((d) => d.isWorking), 'Select at least one working day'),
    workingStartTime: z.string().regex(timeRegex, 'Enter a valid start time'),
    workingEndTime: z.string().regex(timeRegex, 'Enter a valid end time'),
  });

export const createBranchSchema = branchBaseSchema.refine((data) => data.workingStartTime < data.workingEndTime, {
  message: 'Working end time must be after start time',
  path: ['workingEndTime'],
});

export const updateBranchSchema = branchBaseSchema.partial().refine(
  (data) => !data.workingStartTime || !data.workingEndTime || data.workingStartTime < data.workingEndTime,
  { message: 'Working end time must be after start time', path: ['workingEndTime'] },
);
