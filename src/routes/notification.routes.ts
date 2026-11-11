import { Router } from 'express';
import * as controller from '../controllers/notification.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();
router.use(authenticate);

// Every employee sees their own notifications - no extra permission needed.
router.get('/', controller.list);
router.patch('/:id/read', controller.markRead);
router.patch('/read-all', controller.markAllRead);

export default router;
