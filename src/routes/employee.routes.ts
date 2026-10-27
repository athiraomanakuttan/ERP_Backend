import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller';
import { authenticate } from '../middlewares/authenticate';
import { requirePermission } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesQuerySchema,
  idParamSchema,
} from '../validators/employee.validators';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const requireEmployeeVisibility = requirePermission(
  'employees:view', // legacy: treated as assigned-only for non-admin users
  'employees:view_assigned',
  'employees:view_all'
);

router.get('/', requireEmployeeVisibility, validate({ query: listEmployeesQuerySchema }), employeeController.list);
router.get('/search', requireEmployeeVisibility, employeeController.search);
router.get('/:id', requireEmployeeVisibility, validate({ params: idParamSchema }), employeeController.getById);

router.post('/', requirePermission('employees:create'), validate({ body: createEmployeeSchema }), employeeController.create);
router.put(
  '/:id',
  requirePermission('employees:edit'),
  validate({ params: idParamSchema, body: updateEmployeeSchema }),
  employeeController.update
);
router.patch(
  '/:id/status',
  requirePermission('employees:edit'),
  validate({ params: idParamSchema, body: z.object({ status: z.enum(['active', 'inactive']) }) }),
  employeeController.setStatus
);
router.delete('/:id', requirePermission('employees:delete'), validate({ params: idParamSchema }), employeeController.remove);

export default router;
