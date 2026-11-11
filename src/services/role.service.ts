import { roleRepository } from '../repositories/RoleRepository';
import { permissionRepository } from '../repositories/PermissionRepository';
import { AppError } from '../utils/AppError';

export class RoleService {
  async create(data: { name: string; description?: string; permissions: string[] }) {
    const existing = await roleRepository.findByName(data.name);
    if (existing) throw AppError.conflict('A role with this name already exists');
    return roleRepository.create(data as never);
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
    const role = await roleRepository.updateById(id, data as never);
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
