import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, HeadingLevel, ImageRun } from 'docx';
import { invoiceService } from './invoice.service';

function dataUrlBuffer(value?: string): Buffer | undefined {
  if (!value) return undefined;
  const match = value.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) return undefined;
  return Buffer.from(match[2], 'base64');
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${Number(value).toFixed(3)}`;
}

function termLabel(value: string) {
  return ({ due_on_receipt: 'Due on Receipt', due_end_of_month: 'Due End of Month', net_15: 'Net 15', net_45: 'Net 45', net_60: 'Net 60' } as Record<string,string>)[value] || value;
}

class InvoiceExportService {
  async pdf(id: string): Promise<{ buffer: Buffer; fileName: string }> {
    const invoice = await invoiceService.getById(id);
    const doc = new PDFDocument({ size: 'A4', margin: 46 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const logo = dataUrlBuffer(invoice.invoiceLogoDataUrl);
    if (logo) {
      try { doc.image(logo, 46, 42, { fit: [150, 70] }); } catch { /* unsupported image format: omit */ }
    } else {
      doc.fontSize(18).font('Helvetica-Bold').text(invoice.companyName || 'EMS', 46, 48);
    }

    doc.fontSize(24).fillColor('#2386b8').font('Helvetica').text('TAX INVOICE', 330, 45, { align: 'right', width: 215 });
    doc.fontSize(10).fillColor('#111827').font('Helvetica-Bold').text(`# ${invoice.invoiceNumber}`, 330, 77, { align: 'right', width: 215 });

    doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text(invoice.companyName || 'EMS', 46, 130);
    if (invoice.companyVatNumber) doc.fontSize(9).font('Helvetica').text(`VAT No: ${invoice.companyVatNumber}`);

    const metaY = 185;
    doc.fontSize(9).font('Helvetica');
    doc.text(`Invoice Date : ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}`, 325, metaY);
    doc.text(`Terms : ${termLabel(invoice.terms)}`, 325, metaY + 18);
    doc.text(`Due Date : ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, 325, metaY + 36);
    if (invoice.orderNumber) doc.text(`Order No. : ${invoice.orderNumber}`, 325, metaY + 54);
    doc.text(`Sales Person : ${invoice.salesPerson}`, 325, metaY + 72);

    doc.fontSize(9).font('Helvetica').text('Bill To', 46, metaY + 20);
    doc.fontSize(11).font('Helvetica-Bold').text(invoice.customerName, 46, metaY + 36);
    if (invoice.customerVatNumber) doc.fontSize(9).font('Helvetica').text(`VAT No: ${invoice.customerVatNumber}`, 46, metaY + 54);
    doc.fontSize(9).font('Helvetica').text(invoice.customerEmail, 46, metaY + 70);
    doc.fontSize(9).font('Helvetica').text('Subject :', 46, metaY + 96);
    doc.font('Helvetica-Bold').text(invoice.subject, 46, metaY + 111, { width: 490 });

    let y = metaY + 145;
    const cols = [46, 75, 310, 370, 435, 525];
    doc.rect(46, y, 499, 24).fill('#2d83b5');
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
    doc.text('#', cols[0] + 6, y + 8); doc.text('Item & Description', cols[1], y + 8); doc.text('Qty', cols[2], y + 8); doc.text('Rate', cols[3], y + 8); doc.text('Discount', cols[4], y + 8); doc.text('Amount', 490, y + 8, { width: 50, align: 'right' });
    y += 26;
    doc.fillColor('#111827').font('Helvetica').fontSize(8);
    invoice.items.forEach((item, index) => {
      if (y > 660) { doc.addPage(); y = 60; }
      const discount = item.discountValue ? `${item.discountValue}${item.discountType === 'percentage' ? '%' : ''}` : '-';
      doc.text(String(index + 1), cols[0] + 6, y + 8);
      doc.text(item.itemName, cols[1], y + 8, { width: 220 });
      doc.text(item.quantity.toFixed(2), cols[2], y + 8);
      doc.text(item.rate.toFixed(3), cols[3], y + 8);
      doc.text(discount, cols[4], y + 8);
      doc.text(item.total.toFixed(3), 490, y + 8, { width: 50, align: 'right' });
      doc.moveTo(46, y + 24).lineTo(545, y + 24).strokeColor('#d1d5db').stroke();
      y += 28;
    });

    y += 12;
    const totalX = 335;
    const valX = 465;
    const totalLine = (label: string, value: number, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9).fillColor('#111827');
      doc.text(label, totalX, y, { width: 120, align: 'right' });
      doc.text(value.toFixed(3), valX, y, { width: 75, align: 'right' });
      y += bold ? 22 : 18;
    };
    totalLine('Subtotal', invoice.subtotal, true);
    totalLine(`VAT (${invoice.vatPercent}%)`, invoice.vatAmount);
    totalLine('Grand Total', invoice.grandTotal, true);

    y += 14;
    if (y > 690) { doc.addPage(); y = 60; }
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text('Vendor Account Details', 46, y);
    y += 16;
    doc.font('Helvetica').fontSize(8).fillColor('#374151');
    doc.text(`Company Name : ${invoice.companyName || '-'}`, 46, y); y += 14;
    doc.text(`Bank Name : ${invoice.companyBankName || '-'}`, 46, y); y += 14;
    doc.text(`Account Number : ${invoice.companyBankAccountNumber || '-'}`, 46, y); y += 14;
    doc.text(`Branch : ${invoice.companyBankBranch || '-'}`, 46, y); y += 14;
    doc.text(`VAT No : ${invoice.companyVatNumber || '-'}`, 46, y); y += 14;
    doc.text(`Currency : ${invoice.currency}`, 46, y);
    doc.fontSize(7).fillColor('#6b7280').text('Generated by EMS', 46, 785, { width: 499, align: 'center' });
    doc.end();
    return { buffer: await done, fileName: `${invoice.invoiceNumber}.pdf` };
  }

  async docx(id: string): Promise<{ buffer: Buffer; fileName: string }> {
    const invoice = await invoiceService.getById(id);
    const logo = dataUrlBuffer(invoice.invoiceLogoDataUrl);
    const headerRuns: any[] = [];
    if (logo) headerRuns.push(new ImageRun({ data: logo, transformation: { width: 150, height: 70 }, type: 'png' } as any));
    else headerRuns.push(new TextRun({ text: invoice.companyName || 'EMS', bold: true, size: 32 }));

    const itemRows = [
      new TableRow({ children: ['#', 'Item & Description', 'Qty', 'Rate', 'Discount', 'Amount'].map((v) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, bold: true })] })] })) }),
      ...invoice.items.map((item, index) => new TableRow({ children: [
        String(index + 1), item.itemName, item.quantity.toFixed(2), item.rate.toFixed(3), item.discountValue ? `${item.discountValue}${item.discountType === 'percentage' ? '%' : ''}` : '-', item.total.toFixed(3)
      ].map((v) => new TableCell({ children: [new Paragraph(String(v))] })) }))
    ];

    const doc = new Document({ sections: [{ children: [
      new Paragraph({ children: headerRuns }),
      new Paragraph({ text: 'TAX INVOICE', heading: HeadingLevel.TITLE, alignment: AlignmentType.RIGHT }),
      new Paragraph({ text: `# ${invoice.invoiceNumber}`, alignment: AlignmentType.RIGHT }),
      new Paragraph({ text: `Bill To: ${invoice.customerName}`, heading: HeadingLevel.HEADING_2 }),
      new Paragraph(`Customer VAT No: ${invoice.customerVatNumber || '-'}`),
      new Paragraph(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}`),
      new Paragraph(`Terms: ${termLabel(invoice.terms)}`),
      new Paragraph(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`),
      new Paragraph(`Order No.: ${invoice.orderNumber || '-'}`),
      new Paragraph(`Sales Person: ${invoice.salesPerson}`),
      new Paragraph({ children: [new TextRun({ text: 'Subject: ', bold: true }), new TextRun(invoice.subject)] }),
      new Table({ rows: itemRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
      new Paragraph({ children: [new TextRun({ text: `Subtotal: ${formatMoney(invoice.subtotal, invoice.currency)}`, bold: true })], alignment: AlignmentType.RIGHT }),
      new Paragraph({ text: `VAT (${invoice.vatPercent}%): ${formatMoney(invoice.vatAmount, invoice.currency)}`, alignment: AlignmentType.RIGHT }),
      new Paragraph({ children: [new TextRun({ text: `Grand Total: ${formatMoney(invoice.grandTotal, invoice.currency)}`, bold: true })], alignment: AlignmentType.RIGHT }),
      new Paragraph({ text: 'Vendor Account Details', heading: HeadingLevel.HEADING_2 }),
      new Paragraph(`Company Name: ${invoice.companyName || '-'}`),
      new Paragraph(`Bank Name: ${invoice.companyBankName || '-'}`),
      new Paragraph(`Account Number: ${invoice.companyBankAccountNumber || '-'}`),
      new Paragraph(`Branch: ${invoice.companyBankBranch || '-'}`),
      new Paragraph(`VAT No: ${invoice.companyVatNumber || '-'}`),
    ] }] });
    return { buffer: await Packer.toBuffer(doc), fileName: `${invoice.invoiceNumber}.docx` };
  }
}
export const invoiceExportService = new InvoiceExportService();
