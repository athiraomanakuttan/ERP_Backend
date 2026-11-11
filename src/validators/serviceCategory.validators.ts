import { z } from 'zod';
import { objectId } from './common.validators';
export const categoryBodySchema = z.object({ name: z.string().trim().min(2, 'Category name is required').max(120) });
export const categoryIdParamSchema = z.object({ id: objectId('Category ID') });
