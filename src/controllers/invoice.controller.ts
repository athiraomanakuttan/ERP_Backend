import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { invoiceService } from '../services/invoice.service';
import { invoiceExportService } from '../services/invoiceExport.service';
import { sendSuccess } from '../utils/apiResponse';

export const nextNumber = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, { message: 'Invoice number generated', data: { invoiceNumber: await invoiceService.reserveNextNumber() } }));
export const create = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Invoice created successfully', data: await invoiceService.create(req.body, req.user!.id) }, 201));
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, customer, status, paymentState, fromDate, toDate } = req.query as Record<string,string|undefined>;
  const result = await invoiceService.list({ search, customer, status: status as never, paymentState: paymentState as never, fromDate, toDate }, Number(page || 1), Number(limit || 20));
  sendSuccess(res, { message: 'Invoices retrieved', data: result.items, meta: result });
});
export const getById = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Invoice retrieved', data: await invoiceService.getById(req.params.id) }));
export const update = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Invoice updated successfully', data: await invoiceService.update(req.params.id, req.body) }));
export const issue = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Invoice issued successfully', data: await invoiceService.issue(req.params.id) }));
export const cancel = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { message: 'Invoice cancelled', data: await invoiceService.cancel(req.params.id) }));
export const remove = asyncHandler(async (req: Request, res: Response) => { await invoiceService.remove(req.params.id); sendSuccess(res, { message: 'Invoice deleted successfully' }); });
export const downloadPdf = asyncHandler(async (req: Request, res: Response) => { const file = await invoiceExportService.pdf(req.params.id); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`); res.send(file.buffer); });
export const downloadDocx = asyncHandler(async (req: Request, res: Response) => { const file = await invoiceExportService.docx(req.params.id); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`); res.send(file.buffer); });
