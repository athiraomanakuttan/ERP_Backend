import { z } from 'zod';
import { descriptionField, entityName, objectId, optionalDate, optionalObjectId } from './common.validators';

const projectBaseSchema = z.object({
    name: entityName('Project name', 3, 120),
    clientCompany: objectId('Client company'),
    description: descriptionField('Description', 1500),
    startDate: optionalDate(),
    endDate: optionalDate(),
    status: z.enum(['planned', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    projectManager: optionalObjectId('Project manager'),
    teamMembers: z.array(objectId('Team member')).optional(),
    notes: descriptionField('Notes', 1500),
  });

export const createProjectSchema = projectBaseSchema.refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
  message: 'End date cannot be before start date',
  path: ['endDate'],
});
export const updateProjectSchema = projectBaseSchema.omit({ teamMembers: true }).partial().refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  { message: 'End date cannot be before start date', path: ['endDate'] },
);

export const teamMemberSchema = z.object({ employeeId: objectId('Employee') });
