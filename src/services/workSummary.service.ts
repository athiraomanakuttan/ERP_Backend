import { Task } from '../models/Task.model';
import { Project } from '../models/Project.model';
import { taskWorkSessionRepository } from '../repositories/TaskWorkSessionRepository';

function monthRange(month: string): { from: Date; to: Date } {
  const [y, m] = month.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  return { from, to };
}

export class WorkSummaryService {
  /** Objective, recorded-time-based summary only - no subjective rating (spec section 16). */
  async summarize(employeeId: string, params: { month?: string; from?: string; to?: string }) {
    let from: Date | undefined;
    let to: Date | undefined;
    if (params.month) {
      ({ from, to } = monthRange(params.month));
    } else {
      if (params.from) from = new Date(params.from);
      if (params.to) to = new Date(params.to);
    }

    const [tasksAssigned, tasksCompleted, tasksPending, projects, totalSeconds] = await Promise.all([
      Task.countDocuments({ assignees: employeeId, isDeleted: { $ne: true } }),
      Task.countDocuments({ assignees: employeeId, status: 'completed', isDeleted: { $ne: true } }),
      Task.countDocuments({
        assignees: employeeId,
        status: { $nin: ['completed', 'cancelled'] },
        isDeleted: { $ne: true },
      }),
      Project.find({ teamMembers: employeeId, isDeleted: { $ne: true } }).select('name status'),
      taskWorkSessionRepository.totalSecondsForEmployee(employeeId, from, to),
    ]);

    return {
      employeeId,
      period: params.month ?? { from: params.from, to: params.to },
      projectsAssigned: projects,
      tasksAssignedCount: tasksAssigned,
      tasksCompletedCount: tasksCompleted,
      tasksPendingCount: tasksPending,
      totalHoursWorked: Math.round((totalSeconds / 3600) * 100) / 100,
    };
  }
}
export const workSummaryService = new WorkSummaryService();
