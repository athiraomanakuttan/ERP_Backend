import { Router } from 'express';
import * as controller from '../controllers/payment.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { paymentCreateSchema, paymentListQuerySchema } from '../validators/payment.validators';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/', validate({ query: paymentListQuerySchema }), controller.list);
router.post('/', validate({ body: paymentCreateSchema }), controller.create);
export default router;
