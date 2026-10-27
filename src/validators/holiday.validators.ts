import { z } from 'zod';
import { entityName, objectId } from './common.validators';

export const createHolidaySchema = z.object({
  name: entityName('Holiday name', 3, 100),
  date: z.coerce.date(),
  branches: z.array(objectId('Branch')).min(1, 'At least one branch is required'),
});
export const updateHolidaySchema = createHolidaySchema.partial();
