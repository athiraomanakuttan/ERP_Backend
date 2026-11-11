import { z } from 'zod';
import { descriptionField, entityName, objectId } from './common.validators';

export const createRoleSchema = z.object({
  name: entityName('Role name', 3, 80),
  description: descriptionField('Description', 500),
  permissions: z.array(objectId('Permission')).default([]),
});

export const updateRoleSchema = createRoleSchema.partial();

export const createPermissionSchema = z.object({
  module: entityName('Module', 2, 60),
  action: z.enum(['view', 'view_assigned', 'view_all', 'create', 'edit', 'delete', 'approve', 'reject', 'assign']),
  description: descriptionField('Description', 500),
});
