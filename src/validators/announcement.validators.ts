import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title must be 120 characters or fewer'),
  body: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000, 'Message must be 2000 characters or fewer'),
});
