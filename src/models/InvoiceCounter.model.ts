import { Schema, model, Document } from 'mongoose';

export interface IInvoiceCounter extends Document {
  key: string;
  sequence: number;
}

const invoiceCounterSchema = new Schema<IInvoiceCounter>({
  key: { type: String, required: true, unique: true },
  sequence: { type: Number, required: true, default: 0 },
});

export const InvoiceCounter = model<IInvoiceCounter>('InvoiceCounter', invoiceCounterSchema);
