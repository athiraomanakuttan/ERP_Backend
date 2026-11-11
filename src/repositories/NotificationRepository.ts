import { Notification, INotification, NotificationType } from '../models/Notification.model';

export class NotificationRepository {
  async create(payload: {
    recipient: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<INotification> {
    return Notification.create(payload);
  }

  async findForRecipient(recipientId: string, unreadOnly = false): Promise<INotification[]> {
    const filter: Record<string, unknown> = { recipient: recipientId };
    if (unreadOnly) filter.isRead = false;
    return Notification.find(filter).sort('-createdAt').limit(100);
  }

  async markRead(id: string, recipientId: string): Promise<INotification | null> {
    return Notification.findOneAndUpdate({ _id: id, recipient: recipientId }, { isRead: true }, { new: true });
  }

  async markAllRead(recipientId: string): Promise<void> {
    await Notification.updateMany({ recipient: recipientId, isRead: false }, { isRead: true });
  }
}

export const notificationRepository = new NotificationRepository();
