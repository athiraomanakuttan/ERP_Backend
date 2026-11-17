/* eslint-disable no-console */
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Permission } from '../models/Permission.model';
import { Role } from '../models/Role.model';

const SCOPE_PERMISSIONS = [
  { module: 'projects', action: 'view_assigned', key: 'projects:view_assigned', description: 'View projects managed by, assigned to, or created by the user' },
  { module: 'projects', action: 'view_all', key: 'projects:view_all', description: 'View all projects' },
  { module: 'tasks', action: 'view_assigned', key: 'tasks:view_assigned', description: 'View tasks assigned to, awaiting approval by, created by, or in projects managed/created by the user' },
  { module: 'tasks', action: 'view_all', key: 'tasks:view_all', description: 'View all tasks' },
] as const;

async function seed(): Promise<void> {
  await connectDatabase();
  for (const permission of SCOPE_PERMISSIONS) {
    await Permission.findOneAndUpdate(
      { key: permission.key },
      { ...permission, isDeleted: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  const adminRole = await Role.findOne({ name: 'Admin' });
  if (adminRole) {
    const allPermissions = await Permission.find({ isDeleted: { $ne: true } }).select('_id');
    adminRole.permissions = allPermissions.map((permission) => permission._id);
    await adminRole.save();
  }
  console.log('Project/task visibility permissions are ready.');
  await disconnectDatabase();
}

seed().catch((error) => {
  console.error('Resource permission scope seeding failed:', error);
  process.exit(1);
});
