import { Router } from 'express';
import * as roleController from '../controllers/role.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createPermissionSchema } from '../validators/role.validators';

const router = Router();
router.use(authenticate);

router.get('/', roleController.listPermissions);
router.post('/', requireAdmin, validate({ body: createPermissionSchema }), roleController.createPermission);

export default router;
