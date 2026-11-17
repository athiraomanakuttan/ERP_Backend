import { Router } from 'express';
import * as controller from '../controllers/announcement.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createAnnouncementSchema } from '../validators/announcement.validators';

const router = Router();
router.use(authenticate);

// Admin only creates announcements (spec section 14)
router.get('/', controller.list);
router.post('/', requireAdmin, validate({ body: createAnnouncementSchema }), controller.create);
router.delete('/:id', requireAdmin, controller.remove);

export default router;
