import { BaseRepository } from './BaseRepository';
import { Announcement, IAnnouncement } from '../models/Announcement.model';

export class AnnouncementRepository extends BaseRepository<IAnnouncement> {
  constructor() {
    super(Announcement);
  }
}

export const announcementRepository = new AnnouncementRepository();
