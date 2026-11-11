import { Schema, model, Document, Types } from 'mongoose';

export interface IServiceCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  isDeleted: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const serviceCategorySchema = new Schema<IServiceCategory>({
  name: { type: String, required: true, trim: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
}, { timestamps: true });

serviceCategorySchema.index({ name: 1, isDeleted: 1 });

export const ServiceCategory = model<IServiceCategory>('ServiceCategory', serviceCategorySchema);
