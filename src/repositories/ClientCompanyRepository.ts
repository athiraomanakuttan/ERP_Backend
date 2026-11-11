import { BaseRepository } from './BaseRepository';
import { ClientCompany, IClientCompany } from '../models/ClientCompany.model';

export class ClientCompanyRepository extends BaseRepository<IClientCompany> {
  constructor() {
    super(ClientCompany);
  }
}

export const clientCompanyRepository = new ClientCompanyRepository();
