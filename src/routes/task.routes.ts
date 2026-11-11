import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/task.controller';
import { authenticate } from '../middlewares/authenticate';
import { requirePermission, requireFieldPermission } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createTaskSchema, updateTaskSchema, changeStatusSchema, assignEmployeeSchema } from '../validators/task.validators';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('tasks:view', 'tasks:view_assigned', 'tasks:view_all'), controller.list);
router.get('/filter-options', requirePermission('tasks:view', 'tasks:view_assigned', 'tasks:view_all'), controller.filterOptions);
router.get('/timer/current', controller.getCurrentTimer);
router.get('/:id', requirePermission('tasks:view', 'tasks:view_assigned', 'tasks:view_all'), controller.getById);
router.post('/', requirePermission('tasks:create'), validate({ body: createTaskSchema }), controller.create);
router.put('/:id', requirePermission('tasks:edit'), requireFieldPermission(['assignees'], 'tasks:assign'), validate({ body: updateTaskSchema }), controller.update);
router.post(
  '/:id/assignees',
  requirePermission('tasks:assign'),
  validate({ body: assignEmployeeSchema }),
  controller.assignEmployee
);
router.patch('/:id/status', validate({ body: changeStatusSchema }), controller.changeStatus);
router.patch(
  '/:id/approval',
  requirePermission('tasks:approve', 'tasks:reject'),
  validate({ body: z.object({ decision: z.enum(['approve', 'reopen']) }) }),
  controller.decideApproval
);
router.delete('/:id', requirePermission('tasks:delete'), controller.remove);

// Task timer - any assignee can start/pause their own timer, no special permission beyond task view/edit
router.post('/:id/timer/start', controller.startTimer);
router.post('/:id/timer/pause', controller.pauseTimer);
router.get('/:id/timer/total/:employeeId', requirePermission('tasks:view', 'tasks:view_assigned', 'tasks:view_all'), controller.getTotalTime);

export default router;
