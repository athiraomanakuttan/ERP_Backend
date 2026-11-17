import { AppSettings, IAppSettings } from '../models/Settings.model';

export class SettingsService {
  /** Creates the singleton row on first read so the app always has something to return. */
  async get(): Promise<IAppSettings> {
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = await AppSettings.create({});
    }
    return settings;
  }

  async update(data: { companyName?: string; logoDataUrl?: string; themeColor?: string; companyVatNumber?: string; companyBankName?: string; companyBankAccountNumber?: string; companyBankBranch?: string; invoiceLogoDataUrl?: string; defaultVatPercent?: number; defaultSalesPerson?: string; defaultCurrency?: string }, updatedBy: string): Promise<IAppSettings> {
    const settings = await this.get();
    if (data.companyName !== undefined) settings.companyName = data.companyName;
    if (data.logoDataUrl !== undefined) settings.logoDataUrl = data.logoDataUrl || undefined;
    if (data.themeColor !== undefined) settings.themeColor = data.themeColor;
    if (data.companyVatNumber !== undefined) settings.companyVatNumber = data.companyVatNumber || undefined;
    if (data.companyBankName !== undefined) settings.companyBankName = data.companyBankName || undefined;
    if (data.companyBankAccountNumber !== undefined) settings.companyBankAccountNumber = data.companyBankAccountNumber || undefined;
    if (data.companyBankBranch !== undefined) settings.companyBankBranch = data.companyBankBranch || undefined;
    if (data.invoiceLogoDataUrl !== undefined) settings.invoiceLogoDataUrl = data.invoiceLogoDataUrl || undefined;
    if (data.defaultVatPercent !== undefined) settings.defaultVatPercent = data.defaultVatPercent;
    if (data.defaultSalesPerson !== undefined) settings.defaultSalesPerson = data.defaultSalesPerson;
    if (data.defaultCurrency !== undefined) settings.defaultCurrency = data.defaultCurrency.toUpperCase();
    settings.updatedBy = updatedBy as never;
    await settings.save();
    return settings;
  }
}
export const settingsService = new SettingsService();
