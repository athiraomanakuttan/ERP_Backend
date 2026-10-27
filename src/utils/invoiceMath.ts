export interface InvoiceInputItem {
  itemName: string;
  quantity: number;
  rate: number;
  discountType: 'percentage' | 'amount';
  discountValue: number;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function calculateInvoice(items: InvoiceInputItem[], vatPercent: number) {
  const calculatedItems = items.map((item) => {
    const gross = item.quantity * item.rate;
    const discount = item.discountType === 'percentage'
      ? gross * Math.min(item.discountValue, 100) / 100
      : Math.min(item.discountValue, gross);
    const total = roundMoney(Math.max(0, gross - discount));
    return { ...item, total };
  });
  const subtotal = roundMoney(calculatedItems.reduce((sum, item) => sum + item.total, 0));
  const totalBeforeVat = subtotal;
  const vatAmount = roundMoney(totalBeforeVat * vatPercent / 100);
  const grandTotal = roundMoney(totalBeforeVat + vatAmount);
  return { items: calculatedItems, subtotal, totalBeforeVat, vatAmount, grandTotal };
}
