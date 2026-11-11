import { Router } from 'express';
import * as controller from '../controllers/leave.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin, requirePermission } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createLeaveTypeSchema, updateLeaveTypeSchema, createLeaveRequestSchema, decisionSchema } from '../validators/leave.validators';

const router = Router();
router.use(authenticate);

router.get('/types', controller.listTypes);
router.post('/types', requireAdmin, validate({ body: createLeaveTypeSchema }), controller.createType);
router.put('/types/:id', requireAdmin, validate({ body: updateLeaveTypeSchema }), controller.updateType);
router.delete('/types/:id', requireAdmin, controller.removeType);

router.get('/balance/me', controller.myBalance);
router.get('/balance/:employeeId', requirePermission('leaves:view', 'leaves:approve', 'leaves:reject'), controller.employeeBalance);
router.post('/requests', validate({ body: createLeaveRequestSchema }), controller.createRequest);
router.get('/requests/me', controller.myRequests);
router.get('/requests/pending', requirePermission('leaves:approve', 'leaves:reject'), controller.pending);
router.get('/requests/reviewed', requirePermission('leaves:approve', 'leaves:reject', 'leaves:view'), controller.reviewed);
router.patch('/requests/:id/decision', requirePermission('leaves:approve', 'leaves:reject'), validate({ body: decisionSchema }), controller.decide);
router.patch('/requests/:id/cancel', controller.cancel);

export default router;
