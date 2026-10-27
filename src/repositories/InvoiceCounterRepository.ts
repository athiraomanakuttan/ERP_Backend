import { InvoiceCounter } from '../models/InvoiceCounter.model';

class InvoiceCounterRepository {
  async reserve(year: number): Promise<number> {
    const key = `invoice-${year}`;
    const counter = await InvoiceCounter.findOneAndUpdate(
      { key },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return counter.sequence;
  }
}
export const invoiceCounterRepository = new InvoiceCounterRepository();
