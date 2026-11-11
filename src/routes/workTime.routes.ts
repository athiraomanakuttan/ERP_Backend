import { Router } from 'express';
import * as controller from '../controllers/workTime.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createManualWorkSessionSchema, createSelfManualWorkSessionSchema } from '../validators/workTime.validators';

const router = Router();
router.use(authenticate);

router.get('/me', controller.listMine);
router.get('/', controller.list);
router.post('/manual', requireAdmin, validate({ body: createManualWorkSessionSchema }), controller.createManual);
router.post('/manual/me', validate({ body: createSelfManualWorkSessionSchema }), controller.createSelfManual);

export default router;
