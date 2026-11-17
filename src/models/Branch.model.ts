import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkingDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isWorking: boolean;
}

export interface IBranch extends Document {
  _id: Types.ObjectId;
  name: string;
  timezone: string; // IANA tz, e.g. 'Asia/Kolkata'
  workingDays: IWorkingDay[];
  workingStartTime: string; // 'HH:mm'
  workingEndTime: string; // 'HH:mm'
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workingDaySchema = new Schema<IWorkingDay>(
  {
    day: {
      type: String,
      required: true,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    isWorking: { type: Boolean, required: true },
  },
  { _id: false }
);

const branchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    timezone: { type: String, required: true },
    workingDays: { type: [workingDaySchema], required: true },
    workingStartTime: { type: String, required: true },
    workingEndTime: { type: String, required: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Branch = model<IBranch>('Branch', branchSchema);
