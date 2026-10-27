import { Schema, model, Document, Types } from 'mongoose';

/**
 * Singleton document - one row holds the whole app's branding. Read publicly
 * (no auth) so the login screen can also show the company's logo and color
 * before anyone signs in; only Admin can write it.
 */
export interface IAppSettings extends Document {
  _id: Types.ObjectId;
  companyName: string;
  logoDataUrl?: string; // data:image/...;base64,... - stored inline, no external storage needed
  themeColor: string; // '#RRGGBB'
  companyVatNumber?: string;
  companyBankName?: string;
  companyBankAccountNumber?: string;
  companyBankBranch?: string;
  invoiceLogoDataUrl?: string;
  defaultVatPercent: number;
  defaultSalesPerson: string;
  defaultCurrency: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<IAppSettings>(
  {
    companyName: { type: String, default: 'EMS', trim: true },
    logoDataUrl: { type: String },
    themeColor: { type: String, default: '#4F46E5' },
    companyVatNumber: { type: String, trim: true },
    companyBankName: { type: String, trim: true },
    companyBankAccountNumber: { type: String, trim: true },
    companyBankBranch: { type: String, trim: true },
    invoiceLogoDataUrl: { type: String },
    defaultVatPercent: { type: Number, default: 5, min: 0, max: 100 },
    defaultSalesPerson: { type: String, default: 'George P Rajan', trim: true },
    defaultCurrency: { type: String, default: 'OMR', trim: true, uppercase: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

export const AppSettings = model<IAppSettings>('AppSettings', settingsSchema);
