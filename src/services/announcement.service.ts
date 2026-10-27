import { announcementRepository } from '../repositories/AnnouncementRepository';
import { AppError } from '../utils/AppError';

export class AnnouncementService {
  async create(data: { title: string; body: string }, publishedBy: string) {
    return announcementRepository.create({ ...data, publishedBy } as never);
  }
  async list(pagination: { page?: number; limit?: number }) {
    return announcementRepository.paginate({}, pagination);
  }
  async remove(id: string) {
    const result = await announcementRepository.softDeleteById(id);
    if (!result) throw AppError.notFound('Announcement not found');
  }
}
export const announcementService = new AnnouncementService();
