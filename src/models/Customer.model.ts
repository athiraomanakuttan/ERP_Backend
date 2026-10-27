import { Schema, model, Document, Types } from 'mongoose';

export type CustomerType = 'individual' | 'business';

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  customerType: CustomerType;
  primaryContactName: string;
  contactNumber: string;
  companyName?: string;
  email: string;
  vatNumber: string;
  currency: string;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>({
  customerType: { type: String, enum: ['individual', 'business'], required: true },
  primaryContactName: { type: String, required: true, trim: true },
  contactNumber: { type: String, required: true, trim: true },
  companyName: { type: String, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  vatNumber: { type: String, required: true, trim: true },
  currency: { type: String, required: true, trim: true, uppercase: true, default: 'OMR' },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
}, { timestamps: true });

customerSchema.index({ email: 1, isDeleted: 1 });
customerSchema.index({ companyName: 1 });
customerSchema.index({ primaryContactName: 1 });

export const Customer = model<ICustomer>('Customer', customerSchema);
