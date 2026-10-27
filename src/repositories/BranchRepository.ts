import { BaseRepository } from './BaseRepository';
import { Branch, IBranch } from '../models/Branch.model';

export class BranchRepository extends BaseRepository<IBranch> {
  constructor() {
    super(Branch);
  }
}

export const branchRepository = new BranchRepository();
