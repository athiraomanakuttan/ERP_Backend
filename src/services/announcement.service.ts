import { announcementRepository } from '../repositories/AnnouncementRepository';
import { AppError } from '../utils/AppError';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { notificationService } from './notification.service';

export class AnnouncementService {
  async create(data: { title: string; body: string }, publishedBy: string) {
    const announcement = await announcementRepository.create({ ...data, publishedBy } as never);
    const recipientIds = await employeeRepository.findAllActiveIds();
    await Promise.all(recipientIds.filter((id) => id !== publishedBy).map((recipientId) =>
      notificationService.notify(recipientId, 'announcement_published', {
        title: 'New announcement',
        message: data.title,
        relatedEntityType: 'Announcement',
        relatedEntityId: announcement._id.toString(),
      })
    ));
    return announcement;
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
