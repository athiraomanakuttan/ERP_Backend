import { Schema, model, Document, Types } from 'mongoose';

export interface ILeaveType extends Document {
  _id: Types.ObjectId;
  name: string; // e.g. 'Sick Leave', 'Casual Leave'
  defaultDaysPerYear: number;
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const leaveTypeSchema = new Schema<ILeaveType>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    defaultDaysPerYear: { type: Number, required: true, min: 0 },
    description: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const LeaveType = model<ILeaveType>('LeaveType', leaveTypeSchema);

// Approval hierarchy per spec: Reporting Manager -> Team Lead -> Admin
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ILeaveRequest extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId; // ref Employee
  leaveType: Types.ObjectId; // ref LeaveType
  startDate: Date;
  endDate: Date;
  reason?: string;
  status: LeaveStatus;
  currentApprover?: Types.ObjectId; // ref Employee - next person in hierarchy
  decidedBy?: Types.ObjectId; // ref Employee
  decidedAt?: Date;
  decisionNote?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveType: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
    currentApprover: { type: Schema.Types.ObjectId, ref: 'Employee' },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    decidedAt: { type: Date },
    decisionNote: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

leaveRequestSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    next(new Error('End date cannot precede start date'));
    return;
  }
  next();
});

export const LeaveRequest = model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);
