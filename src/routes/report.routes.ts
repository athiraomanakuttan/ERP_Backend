import { Router } from 'express';
import * as controller from '../controllers/report.controller';
import { authenticate } from '../middlewares/authenticate';
import { requirePermission } from '../middlewares/requirePermission';

const router = Router();
router.use(authenticate);

router.get('/analytics', requirePermission('reports:view'), controller.analytics);
router.get('/employees', requirePermission('reports:view'), controller.employees);
router.get('/attendance-summary', requirePermission('reports:view'), controller.attendanceSummary);
router.get('/attendance', requirePermission('reports:view'), controller.attendance);
router.get('/leaves', requirePermission('reports:view'), controller.leaves);
router.get('/projects', requirePermission('reports:view'), controller.projects);
router.get('/tasks', requirePermission('reports:view'), controller.tasks);
router.get('/branches', requirePermission('reports:view'), controller.branches);
router.get('/client-companies', requirePermission('reports:view'), controller.clientCompanies);

export default router;
