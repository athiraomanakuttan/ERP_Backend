import { z } from 'zod';
import { descriptionField, entityName, objectId, optionalDate } from './common.validators';

export const createTaskSchema = z.object({
  title: entityName('Task title', 3, 150),
  description: descriptionField('Description', 1500),
  project: objectId('Project'),
  assignees: z.array(objectId('Assignee')).min(1, 'At least one assignee is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: optionalDate(),
});
export const updateTaskSchema = createTaskSchema.partial().omit({ project: true });

export const changeStatusSchema = z.object({
  status: z.enum(['to_do', 'in_progress', 'on_hold', 'completed', 'cancelled', 'reopened']),
});

export const assignEmployeeSchema = z.object({ employeeId: objectId('Employee') });
