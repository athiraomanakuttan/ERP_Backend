import { z } from 'zod';

export const workSummaryQuerySchema = z.object({
  employeeId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // 'YYYY-MM'
  from: z.string().optional(), // 'YYYY-MM-DD'
  to: z.string().optional(),
});
