import { Schema, model, Document, Types } from 'mongoose';

export interface IAnnouncement extends Document {
  _id: Types.ObjectId;
  title: string;
  body: string;
  publishedBy: Types.ObjectId; // ref Employee (Admin)
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Announcement = model<IAnnouncement>('Announcement', announcementSchema);
