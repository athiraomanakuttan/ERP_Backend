import { BaseRepository } from './BaseRepository';
import { Permission, IPermission } from '../models/Permission.model';

export class PermissionRepository extends BaseRepository<IPermission> {
  constructor() {
    super(Permission);
  }

  async findByKeys(keys: string[]): Promise<IPermission[]> {
    return Permission.find({ key: { $in: keys }, isDeleted: { $ne: true } });
  }
  async ensureVisibilityScopes(): Promise<void> {
    const scopes = [
      { module: 'employees', action: 'view_assigned', key: 'employees:view_assigned', description: 'View employees assigned to the user as Reporting Manager or Team Lead' },
      { module: 'employees', action: 'view_all', key: 'employees:view_all', description: 'View all non-admin employees' },
      { module: 'projects', action: 'view_assigned', key: 'projects:view_assigned', description: 'View projects managed by, assigned to, or created by the user' },
      { module: 'projects', action: 'view_all', key: 'projects:view_all', description: 'View all projects' },
      { module: 'tasks', action: 'view_assigned', key: 'tasks:view_assigned', description: 'View tasks assigned to, awaiting approval by, created by, or in projects managed/created by the user' },
      { module: 'tasks', action: 'view_all', key: 'tasks:view_all', description: 'View all tasks' },
    ];
    for (const scope of scopes) {
      await Permission.findOneAndUpdate(
        { key: scope.key },
        { ...scope, isDeleted: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

}

export const permissionRepository = new PermissionRepository();
