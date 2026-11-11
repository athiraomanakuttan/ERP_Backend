import { Router } from 'express';
import * as controller from '../controllers/customer.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { customerSchema, customerUpdateSchema, customerIdParamSchema, customerListQuerySchema } from '../validators/customer.validators';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/', validate({ query: customerListQuerySchema }), controller.list);
router.post('/', validate({ body: customerSchema }), controller.create);
router.get('/:id', validate({ params: customerIdParamSchema }), controller.getById);
router.put('/:id', validate({ params: customerIdParamSchema, body: customerUpdateSchema }), controller.update);
router.delete('/:id', validate({ params: customerIdParamSchema }), controller.remove);
export default router;
