import { Schema, model, Document, Types } from 'mongoose';

// Fixed statuses per spec section 8 - NOT configurable (see section 18: Out of Scope)
export type TaskStatus =
  | 'to_do'
  | 'in_progress'
  | 'on_hold'
  | 'pending_approval'
  | 'completed'
  | 'cancelled'
  | 'reopened';

export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  project: Types.ObjectId; // ref Project
  assignees: Types.ObjectId[]; // ref Employee[] - must all be project team members
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  createdBy?: Types.ObjectId; // ref Employee; used for scoped access/audit
  pendingApprover?: Types.ObjectId; // current completion approver
  submittedForApprovalAt?: Date;
  submittedBy?: Types.ObjectId; // employee who submitted the task for approval
  approvedBy?: Types.ObjectId; // ref Employee
  approvedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'Employee', index: true }],
    status: {
      type: String,
      enum: ['to_do', 'in_progress', 'on_hold', 'pending_approval', 'completed', 'cancelled', 'reopened'],
      default: 'to_do',
      index: true,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    dueDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    pendingApprover: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    submittedForApprovalAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    approvedAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Task = model<ITask>('Task', taskSchema);
