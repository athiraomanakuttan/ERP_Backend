import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';

const router = Router();
router.use(authenticate);

router.get('/admin', requireAdmin, controller.admin);
router.get('/me', controller.mine);

export default router;
