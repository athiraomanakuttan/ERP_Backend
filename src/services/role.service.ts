import { roleRepository } from '../repositories/RoleRepository';
import { permissionRepository } from '../repositories/PermissionRepository';
import { AppError } from '../utils/AppError';

const SCOPED_MODULES = ['employees', 'projects', 'tasks'];

async function sanitizeScopedPermissions(permissionIds: string[]): Promise<string[]> {
  if (!permissionIds.length) return [];
  const permissions = await permissionRepository.findMany({ _id: { $in: permissionIds } } as never);
  const selectedKeys = new Set(permissions.map((permission) => permission.key));
  const blockedActionIds = new Set<string>();

  for (const module of SCOPED_MODULES) {
    const hasVisibility = selectedKeys.has(`${module}:view`) || selectedKeys.has(`${module}:view_assigned`) || selectedKeys.has(`${module}:view_all`);
    if (!hasVisibility) {
      permissions
        .filter((permission) => permission.module === module && !['view', 'view_assigned', 'view_all'].includes(permission.action))
        .forEach((permission) => blockedActionIds.add(permission._id.toString()));
    }
  }
  return permissionIds.filter((id) => !blockedActionIds.has(id));
}

export class RoleService {
  async create(data: { name: string; description?: string; permissions: string[] }) {
    const existing = await roleRepository.findByName(data.name);
    if (existing) throw AppError.conflict('A role with this name already exists');
    const permissions = await sanitizeScopedPermissions(data.permissions);
    return roleRepository.create({ ...data, permissions } as never);
  }

  async list() {
    return roleRepository.findMany({}, { sort: 'name' });
  }

  async getById(id: string) {
    const role = await roleRepository.findWithPermissions(id);
    if (!role) throw AppError.notFound('Role not found');
    return role;
  }

  async update(id: string, data: Partial<{ name: string; description?: string; permissions: string[] }>) {
    const normalized = data.permissions ? { ...data, permissions: await sanitizeScopedPermissions(data.permissions) } : data;
    const role = await roleRepository.updateById(id, normalized as never);
    if (!role) throw AppError.notFound('Role not found');
    return role;
  }

  async remove(id: string) {
    const role = await roleRepository.findById(id);
    if (!role) throw AppError.notFound('Role not found');
    if (role.isSystemRole) throw AppError.forbidden('System roles cannot be deleted');
    await roleRepository.softDeleteById(id);
  }
}
export const roleService = new RoleService();

export class PermissionService {
  async create(data: { module: string; action: string; description?: string }) {
    return permissionRepository.create(data as never);
  }

  async list() {
    await permissionRepository.ensureVisibilityScopes();
    return permissionRepository.findMany({ isDeleted: { $ne: true } });
  }
}
export const permissionService = new PermissionService();
