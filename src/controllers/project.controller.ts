import { Request, Response } from 'express';
import { projectService } from '../services/project.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.create(req.body, req.user!);
  sendSuccess(res, { message: 'Project created successfully', data: project }, 201);
});
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, clientCompany, search } = req.query as Record<string, string | undefined>;
  const result = await projectService.list(
    req.user!,
    { status, clientCompany, search },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendSuccess(res, { message: 'Projects retrieved', data: result.items, meta: result });
});
export const clientCompanyOptions = asyncHandler(async (req: Request, res: Response) => {
  const options = await projectService.clientCompanyOptions(req.user!);
  sendSuccess(res, { message: 'Project client company options retrieved', data: options });
});
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.getById(req.user!, req.params.id);
  sendSuccess(res, { message: 'Project retrieved', data: project });
});
export const workSummary = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  const result = await projectService.workSummary(
    req.user!,
    req.params.id,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );
  sendSuccess(res, { message: 'Project work summary retrieved', data: result });
});

export const employeeWorkSummary = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  const result = await projectService.employeeWorkSummary(
    req.user!,
    req.params.id,
    req.params.employeeId,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );
  sendSuccess(res, { message: 'Employee project work summary retrieved', data: result });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.update(req.user!, req.params.id, req.body);
  sendSuccess(res, { message: 'Project updated successfully', data: project });
});
export const addTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.addTeamMember(req.user!, req.params.id, req.body.employeeId);
  sendSuccess(res, { message: 'Team member added', data: project });
});
export const removeTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.removeTeamMember(req.user!, req.params.id, req.params.employeeId);
  sendSuccess(res, { message: 'Team member removed', data: project });
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await projectService.remove(req.user!, req.params.id);
  sendSuccess(res, { message: 'Project removed successfully' });
});
