import { notificationRepository } from '../repositories/NotificationRepository';
import { NotificationType } from '../models/Notification.model';

export class NotificationService {
  async notify(
    recipientId: string,
    type: NotificationType,
    payload: { title: string; message: string; relatedEntityType?: string; relatedEntityId?: string }
  ) {
    return notificationRepository.create({ recipient: recipientId, type, ...payload });
  }

  async list(recipientId: string, unreadOnly = false) {
    return notificationRepository.findForRecipient(recipientId, unreadOnly);
  }

  async markRead(id: string, recipientId: string) {
    return notificationRepository.markRead(id, recipientId);
  }

  async markAllRead(recipientId: string) {
    return notificationRepository.markAllRead(recipientId);
  }
}
export const notificationService = new NotificationService();
