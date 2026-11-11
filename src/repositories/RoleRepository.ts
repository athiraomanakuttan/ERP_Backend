import { BaseRepository } from './BaseRepository';
import { Role, IRole } from '../models/Role.model';

export class RoleRepository extends BaseRepository<IRole> {
  constructor() {
    super(Role);
  }

  async findByName(name: string): Promise<IRole | null> {
    return Role.findOne({ name, isDeleted: { $ne: true } });
  }

  async findWithPermissions(id: string): Promise<IRole | null> {
    return Role.findOne({ _id: id, isDeleted: { $ne: true } }).populate('permissions');
  }
}

export const roleRepository = new RoleRepository();
