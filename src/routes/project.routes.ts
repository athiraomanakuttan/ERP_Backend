import { Router } from 'express';
import * as controller from '../controllers/project.controller';
import { authenticate } from '../middlewares/authenticate';
import { requirePermission, requireFieldPermission } from '../middlewares/requirePermission';
import { validate } from '../middlewares/validate';
import { createProjectSchema, updateProjectSchema, teamMemberSchema } from '../validators/project.validators';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('projects:view', 'projects:view_assigned', 'projects:view_all'), controller.list);
router.get('/filter-options/client-companies', requirePermission('projects:view', 'projects:view_assigned', 'projects:view_all'), controller.clientCompanyOptions);
router.get('/:id/work-summary', requirePermission('projects:view', 'projects:view_assigned', 'projects:view_all'), controller.workSummary);
router.get('/:id/work-summary/:employeeId', requirePermission('projects:view', 'projects:view_assigned', 'projects:view_all'), controller.employeeWorkSummary);
router.get('/:id', requirePermission('projects:view', 'projects:view_assigned', 'projects:view_all'), controller.getById);
router.post('/', requirePermission('projects:create'), requireFieldPermission(['projectManager', 'teamMembers'], 'projects:assign'), validate({ body: createProjectSchema }), controller.create);
router.put('/:id', requirePermission('projects:edit'), requireFieldPermission(['projectManager'], 'projects:assign'), validate({ body: updateProjectSchema }), controller.update);
router.post(
  '/:id/team-members',
  requirePermission('projects:assign'),
  validate({ body: teamMemberSchema }),
  controller.addTeamMember
);
router.delete('/:id/team-members/:employeeId', requirePermission('projects:assign'), controller.removeTeamMember);
router.delete('/:id', requirePermission('projects:delete'), controller.remove);

export default router;
