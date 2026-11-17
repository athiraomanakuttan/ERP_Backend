import { branchRepository } from '../repositories/BranchRepository';
import { AppError } from '../utils/AppError';

export class BranchService {
  async create(data: Record<string, unknown>) {
    return branchRepository.create(data as never);
  }
  async list() {
    return branchRepository.findMany();
  }
  async getById(id: string) {
    const branch = await branchRepository.findById(id);
    if (!branch) throw AppError.notFound('Branch not found');
    return branch;
  }
  async update(id: string, data: Record<string, unknown>) {
    const branch = await branchRepository.updateById(id, data as never);
    if (!branch) throw AppError.notFound('Branch not found');
    return branch;
  }
  async remove(id: string) {
    const result = await branchRepository.softDeleteById(id);
    if (!result) throw AppError.notFound('Branch not found');
  }
}
export const branchService = new BranchService();
