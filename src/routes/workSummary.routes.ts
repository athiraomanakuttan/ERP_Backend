import { Router } from 'express';
import * as controller from '../controllers/workSummary.controller';
import { authenticate } from '../middlewares/authenticate';
import { requirePermission } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { workSummaryQuerySchema } from '../validators/workSummary.validators';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('work-summary:view'), validate({ query: workSummaryQuerySchema }), controller.summarize);

export default router;
