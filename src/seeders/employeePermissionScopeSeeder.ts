/* eslint-disable no-console */
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Permission } from '../models/Permission.model';
import { Role } from '../models/Role.model';

const SCOPE_PERMISSIONS = [
  {
    module: 'employees',
    action: 'view_assigned',
    key: 'employees:view_assigned',
    description: 'View only employees assigned to the user as Reporting Manager or Team Lead',
  },
  {
    module: 'employees',
    action: 'view_all',
    key: 'employees:view_all',
    description: 'View all non-admin employees',
  },
] as const;

async function seed(): Promise<void> {
  await connectDatabase();

  for (const permission of SCOPE_PERMISSIONS) {
    await Permission.findOneAndUpdate(
      { key: permission.key },
      permission,
      { upsert: true, new: true, runValidators: true }
    );
  }

  // Keep the system Admin role synchronized for display/consistency.
  // Runtime Admin authorization still bypasses permission checks through isAdmin.
  const adminRole = await Role.findOne({ name: 'Admin', isDeleted: { $ne: true } });
  if (adminRole) {
    const allPermissions = await Permission.find({ isDeleted: { $ne: true } }).select('_id');
    adminRole.permissions = allPermissions.map((permission) => permission._id);
    await adminRole.save();
  }

  console.log('Employee visibility permissions are ready: employees:view_assigned, employees:view_all');
  await disconnectDatabase();
}

seed().catch((error) => {
  console.error('Employee permission scope seeding failed:', error);
  process.exit(1);
});
