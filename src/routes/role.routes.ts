import { Router } from 'express';
import * as roleController from '../controllers/role.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createRoleSchema, updateRoleSchema, createPermissionSchema } from '../validators/role.validators';

const router = Router();
router.use(authenticate);

// Admin creates/manages roles and permissions (spec section 3)
router.get('/', roleController.listRoles);
router.get('/:id', roleController.getRole);
router.post('/', requireAdmin, validate({ body: createRoleSchema }), roleController.createRole);
router.put('/:id', requireAdmin, validate({ body: updateRoleSchema }), roleController.updateRole);
router.delete('/:id', requireAdmin, roleController.removeRole);

export default router;
