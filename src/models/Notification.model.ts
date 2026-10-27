import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'client_company_created'
  | 'project_created'
  | 'task_created'
  | 'task_submitted'
  | 'task_completed'
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId; // ref Employee
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string; // 'Task' | 'Project' | 'LeaveRequest' | 'ClientCompany'
  relatedEntityId?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'client_company_created',
        'project_created',
        'task_created',
        'task_submitted',
        'task_completed',
        'leave_requested',
        'leave_approved',
        'leave_rejected',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedEntityType: { type: String },
    relatedEntityId: { type: Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
