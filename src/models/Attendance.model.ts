import { Schema, model, Document, Types } from 'mongoose';

export interface IBreakEntry {
  breakStart: Date;
  breakEnd?: Date | null;
}

export interface IAttendanceSession extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId; // ref Employee
  workDate: string; // 'YYYY-MM-DD' in employee's branch timezone - for querying/grouping
  checkInTime: Date;
  checkOutTime?: Date | null;
  breaks: IBreakEntry[];
  correctedBy?: Types.ObjectId; // ref Employee (lead who corrected this record)
  correctionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const breakEntrySchema = new Schema<IBreakEntry>(
  {
    breakStart: { type: Date, required: true },
    breakEnd: { type: Date, default: null },
  },
  { _id: false }
);

const attendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    workDate: { type: String, required: true, index: true }, // e.g. '2026-09-23'
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date, default: null },
    breaks: { type: [breakEntrySchema], default: [] },
    correctedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    correctionReason: { type: String },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ employee: 1, workDate: 1 });

export const AttendanceSession = model<IAttendanceSession>('AttendanceSession', attendanceSessionSchema);
