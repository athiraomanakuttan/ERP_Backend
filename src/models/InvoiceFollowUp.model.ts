import { Schema, model, Document, Types } from 'mongoose';

export interface IInvoiceFollowUp extends Document {
  _id: Types.ObjectId;
  invoice: Types.ObjectId;
  customer: Types.ObjectId;
  followUpDate: Date;
  message: string;
  contactPerson: string;
  contactNumber: string;
  createdBy: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceFollowUpSchema = new Schema<IInvoiceFollowUp>({
  invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  followUpDate: { type: Date, required: true, index: true },
  message: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  contactNumber: { type: String, required: true, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

invoiceFollowUpSchema.index({ invoice: 1, followUpDate: -1, createdAt: -1 });

export const InvoiceFollowUp = model<IInvoiceFollowUp>('InvoiceFollowUp', invoiceFollowUpSchema);
