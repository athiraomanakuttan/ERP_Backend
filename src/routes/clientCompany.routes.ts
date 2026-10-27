import { Router } from 'express';
import * as controller from '../controllers/clientCompany.controller';
import { authenticate } from '../middlewares/authenticate';
import { requirePermission } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createClientCompanySchema, updateClientCompanySchema } from '../validators/clientCompany.validators';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('client-companies:view'), controller.list);
router.get('/:id', requirePermission('client-companies:view'), controller.getById);
router.post('/', requirePermission('client-companies:create'), validate({ body: createClientCompanySchema }), controller.create);
router.put('/:id', requirePermission('client-companies:edit'), validate({ body: updateClientCompanySchema }), controller.update);
router.delete('/:id', requirePermission('client-companies:delete'), controller.remove);

export default router;
