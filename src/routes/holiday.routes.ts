import { Router } from 'express';
import * as controller from '../controllers/holiday.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createHolidaySchema, updateHolidaySchema } from '../validators/holiday.validators';

const router = Router();
router.use(authenticate);

// Admin only creates holidays/off days (spec section 12)
router.get('/', controller.list);
router.get('/branch/:branchId', controller.listByBranch);
router.get('/upcoming', controller.upcoming);
router.post('/', requireAdmin, validate({ body: createHolidaySchema }), controller.create);
router.put('/:id', requireAdmin, validate({ body: updateHolidaySchema }), controller.update);
router.delete('/:id', requireAdmin, controller.remove);

export default router;
