import { Router } from 'express';
import * as branchController from '../controllers/branch.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createBranchSchema, updateBranchSchema } from '../validators/branch.validators';

const router = Router();
router.use(authenticate);

// Admin creates and manages branches (spec section 5)
router.get('/', branchController.list);
router.get('/:id', branchController.getById);
router.post('/', requireAdmin, validate({ body: createBranchSchema }), branchController.create);
router.put('/:id', requireAdmin, validate({ body: updateBranchSchema }), branchController.update);
router.delete('/:id', requireAdmin, branchController.remove);

export default router;
