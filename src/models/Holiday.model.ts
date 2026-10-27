import { Schema, model, Document, Types } from 'mongoose';

export interface IHoliday extends Document {
  _id: Types.ObjectId;
  name: string;
  date: Date;
  branches: Types.ObjectId[]; // ref Branch[] - same holiday can apply to multiple branches
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const holidaySchema = new Schema<IHoliday>(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    branches: [{ type: Schema.Types.ObjectId, ref: 'Branch', required: true }],
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Holiday = model<IHoliday>('Holiday', holidaySchema);
