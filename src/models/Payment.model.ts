import { Schema, model, Document, Types } from 'mongoose';

export type PaymentMode = 'cash' | 'bank_remittance' | 'bank_transfer' | 'cheque';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  invoice: Types.ObjectId;
  customer: Types.ObjectId;
  paymentId: string;
  amountReceived: number;
  bankCharges: number;
  netDeposited: number;
  paymentDate: Date;
  paymentMode: PaymentMode;
  paymentReceivedOn: Date;
  depositedTo?: string;
  referenceId?: string;
  notes?: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  paymentId: { type: String, required: true, unique: true, trim: true, index: true },
  amountReceived: { type: Number, required: true, min: 0.001 },
  bankCharges: { type: Number, default: 0, min: 0 },
  netDeposited: { type: Number, required: true, min: 0 },
  paymentDate: { type: Date, required: true },
  paymentMode: { type: String, enum: ['cash', 'bank_remittance', 'bank_transfer', 'cheque'], required: true },
  paymentReceivedOn: { type: Date, required: true },
  depositedTo: { type: String, trim: true },
  referenceId: { type: String, trim: true },
  notes: { type: String, trim: true },
  attachmentName: { type: String, trim: true },
  attachmentDataUrl: { type: String },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
}, { timestamps: true });

paymentSchema.index({ paymentDate: -1 });

export const Payment = model<IPayment>('Payment', paymentSchema);
