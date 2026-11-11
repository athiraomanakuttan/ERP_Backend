import { Router } from 'express';
import * as controller from '../controllers/attendance.controller';
import { authenticate } from '../middlewares/authenticate';
import { requirePermission } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { correctionSchema, rangeQuerySchema, teamRangeQuerySchema } from '../validators/attendance.validators';

const router = Router();
router.use(authenticate);

// Self-service - attendance is employee-driven (spec section 10)
router.post('/check-in', controller.checkIn);
router.post('/check-out', controller.checkOut);
router.post('/break/start', controller.startBreak);
router.post('/break/end', controller.endBreak);
router.get('/me/today', controller.myToday);
router.get('/me/history', validate({ query: rangeQuerySchema }), controller.history);
router.get('/team/employees', requirePermission('attendance:view'), controller.teamEmployees);
router.get('/team/history', requirePermission('attendance:view'), validate({ query: teamRangeQuerySchema }), controller.teamHistory);

// Lead/Admin views and corrections - permission controlled
router.get('/:employeeId/history', requirePermission('attendance:view'), validate({ query: rangeQuerySchema }), controller.history);
router.patch(
  '/:id/correct',
  requirePermission('attendance:edit'),
  validate({ body: correctionSchema }),
  controller.correct
);

export default router;
