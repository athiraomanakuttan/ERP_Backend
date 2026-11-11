/* eslint-disable no-console */
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { Employee } from '../models/Employee.model';
import { Role } from '../models/Role.model';
import { Branch } from '../models/Branch.model';
import { Permission, PermissionAction } from '../models/Permission.model';

const MODULES = [
  'employees',
  'roles',
  'branches',
  'client-companies',
  'projects',
  'tasks',
  'attendance',
  'leaves',
  'holidays',
  'announcements',
  'reports',
  'work-summary',
];
const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign'];
const VISIBILITY_SCOPE_PERMISSIONS: Array<{ module: string; action: PermissionAction; key: string; description: string }> = [
  { module: 'employees', action: 'view_assigned', key: 'employees:view_assigned', description: 'View only employees assigned to the user as Reporting Manager or Team Lead' },
  { module: 'employees', action: 'view_all', key: 'employees:view_all', description: 'View all non-admin employees' },
  { module: 'projects', action: 'view_assigned', key: 'projects:view_assigned', description: 'View projects managed by, assigned to, or created by the user' },
  { module: 'projects', action: 'view_all', key: 'projects:view_all', description: 'View all projects' },
  { module: 'tasks', action: 'view_assigned', key: 'tasks:view_assigned', description: 'View tasks assigned to, awaiting approval by, created by, or in projects managed/created by the user' },
  { module: 'tasks', action: 'view_all', key: 'tasks:view_all', description: 'View all tasks' },
];

async function seed(): Promise<void> {
  await connectDatabase();

  // 1. Base permission catalog (idempotent)
  const permissionDocs = [];
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      permissionDocs.push({ module, action, key: `${module}:${action}` });
    }
  }
  permissionDocs.push(...VISIBILITY_SCOPE_PERMISSIONS);
  for (const doc of permissionDocs) {
    await Permission.findOneAndUpdate({ key: doc.key }, doc, { upsert: true, new: true });
  }
  const allPermissions = await Permission.find({});
  console.log(`Seeded ${allPermissions.length} permissions`);

  // 2. Admin system role (kept for consistency, though isAdmin bypasses permission checks)
  let adminRole = await Role.findOne({ name: 'Admin' });
  if (!adminRole) {
    adminRole = await Role.create({
      name: 'Admin',
      description: 'Full system access',
      permissions: allPermissions.map((p) => p._id),
      isSystemRole: true,
    });
    console.log('Created Admin role');
  } else {
    adminRole.permissions = allPermissions.map((p) => p._id);
    adminRole.isSystemRole = true;
    await adminRole.save();
  }

  // 3. Default branch (required FK for the admin employee record)
  let defaultBranch = await Branch.findOne({ name: 'Head Office' });
  if (!defaultBranch) {
    defaultBranch = await Branch.create({
      name: 'Head Office',
      timezone: 'Asia/Kolkata',
      workingDays: [
        { day: 'monday', isWorking: true },
        { day: 'tuesday', isWorking: true },
        { day: 'wednesday', isWorking: true },
        { day: 'thursday', isWorking: true },
        { day: 'friday', isWorking: true },
        { day: 'saturday', isWorking: false },
        { day: 'sunday', isWorking: false },
      ],
      workingStartTime: '09:00',
      workingEndTime: '18:00',
    });
    console.log('Created default branch: Head Office');
  }

  // 4. Admin employee
  const existingAdmin = await Employee.findOne({ email: env.adminEmail });
  if (existingAdmin) {
    console.log(`Admin employee already exists: ${env.adminEmail}`);
  } else {
    await Employee.create({
      firstName: env.adminFirstName,
      lastName: 'Admin',
      dateOfBirth: new Date('1990-01-01'),
      phone: '0000000000',
      email: env.adminEmail,
      address: 'N/A',
      passwordHash: env.adminPassword, // hashed by pre-save hook
      isAdmin: true,
      joiningDate: new Date(),
      role: adminRole._id,
      branch: defaultBranch._id,
      status: 'active',
    });
    console.log(`Created Admin employee: ${env.adminEmail} / (password from ADMIN_PASSWORD env var)`);
  }

  await disconnectDatabase();
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
