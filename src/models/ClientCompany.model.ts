import { Schema, model, Document, Types } from 'mongoose';

export interface IClientCompany extends Document {
  _id: Types.ObjectId;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  status: 'active' | 'inactive';
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientCompanySchema = new Schema<IClientCompany>(
  {
    companyName: { type: String, required: true, trim: true, index: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const ClientCompany = model<IClientCompany>('ClientCompany', clientCompanySchema);
