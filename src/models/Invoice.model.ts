import { Schema, model, Document, Types } from 'mongoose';

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';
export type InvoiceTerms = 'due_on_receipt' | 'due_end_of_month' | 'net_15' | 'net_45' | 'net_60';
export type DiscountType = 'percentage' | 'amount';

export interface IInvoiceItem {
  itemName: string;
  quantity: number;
  rate: number;
  discountType: DiscountType;
  discountValue: number;
  total: number;
}

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerVatNumber?: string;
  currency: string;
  invoiceNumber: string;
  orderNumber?: string;
  invoiceDate: Date;
  terms: InvoiceTerms;
  dueDate: Date;
  salesPerson: string;
  companyName: string;
  companyVatNumber?: string;
  companyBankName?: string;
  companyBankAccountNumber?: string;
  companyBankBranch?: string;
  invoiceLogoDataUrl?: string;
  subject: string;
  vatPercent: number;
  items: IInvoiceItem[];
  subtotal: number;
  totalBeforeVat: number;
  vatAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  issuedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  itemName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.0001 },
  rate: { type: Number, required: true, min: 0 },
  discountType: { type: String, enum: ['percentage', 'amount'], default: 'percentage' },
  discountValue: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, trim: true },
  customerVatNumber: { type: String, trim: true },
  currency: { type: String, required: true, uppercase: true },
  invoiceNumber: { type: String, required: true, unique: true, trim: true, index: true },
  orderNumber: { type: String, trim: true },
  invoiceDate: { type: Date, required: true, index: true },
  terms: { type: String, enum: ['due_on_receipt', 'due_end_of_month', 'net_15', 'net_45', 'net_60'], required: true },
  dueDate: { type: Date, required: true },
  salesPerson: { type: String, required: true, trim: true },
  companyName: { type: String, required: true, trim: true },
  companyVatNumber: { type: String, trim: true },
  companyBankName: { type: String, trim: true },
  companyBankAccountNumber: { type: String, trim: true },
  companyBankBranch: { type: String, trim: true },
  invoiceLogoDataUrl: { type: String },
  subject: { type: String, required: true, trim: true },
  vatPercent: { type: Number, required: true, min: 0, max: 100 },
  items: { type: [invoiceItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  totalBeforeVat: { type: Number, required: true, min: 0 },
  vatAmount: { type: Number, required: true, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  balanceDue: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'], default: 'draft', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  issuedAt: Date,
  cancelledAt: Date,
}, { timestamps: true });

invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);
