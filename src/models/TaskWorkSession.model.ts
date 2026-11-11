import { Schema, model, Document, Types } from 'mongoose';

/**
 * A single continuous interval an employee spent on a task.
 * Automatic sessions are created by Start/Pause/Break/Checkout.
 * Manual sessions are Admin-entered corrections for missed timer activity.
 */
export interface ITaskWorkSession extends Document {
  _id: Types.ObjectId;
  task: Types.ObjectId;
  employee: Types.ObjectId;
  startTime: Date;
  endTime?: Date | null;
  durationSeconds?: number;
  endReason?: 'manual_pause' | 'checkout' | 'break_start' | 'task_completed' | 'manual_entry' | 'logout';
  entryType: 'automatic' | 'manual';
  manualReason?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskWorkSessionSchema = new Schema<ITaskWorkSession>(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, default: null, index: true },
    durationSeconds: { type: Number, default: null },
    endReason: {
      type: String,
      enum: ['manual_pause', 'checkout', 'break_start', 'task_completed', 'manual_entry', 'logout'],
    },
    entryType: { type: String, enum: ['automatic', 'manual'], default: 'automatic', index: true },
    manualReason: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

// A given employee should have at most one running automatic session at a time.
// The service layer enforces this rule before creating a new session.
taskWorkSessionSchema.index({ employee: 1, endTime: 1 });
taskWorkSessionSchema.index({ task: 1, employee: 1 });
taskWorkSessionSchema.index({ employee: 1, startTime: 1, endTime: 1 });

export const TaskWorkSession = model<ITaskWorkSession>('TaskWorkSession', taskWorkSessionSchema);
