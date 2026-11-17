import { Router } from 'express';
import * as controller from '../controllers/settings.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { updateSettingsSchema } from '../validators/settings.validators';

const router = Router();

// Public - the login screen and every other unauthenticated view need branding too.
router.get('/', controller.get);
router.get('/admin', authenticate, requireAdmin, controller.getAdmin);

router.put('/', authenticate, requireAdmin, validate({ body: updateSettingsSchema }), controller.update);

export default router;
