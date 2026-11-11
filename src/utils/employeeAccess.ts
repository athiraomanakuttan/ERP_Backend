export interface EmployeeAccessContext {
  id: string;
  isAdmin: boolean;
  permissionKeys: string[];
}

export type EmployeeVisibilityScope = 'admin' | 'all' | 'assigned' | 'none';

/**
 * Employee visibility is intentionally separate from action permissions.
 * - Admin: may access every employee, including the protected Admin account.
 * - employees:view_all: may access every non-admin employee.
 * - employees:view_assigned or legacy employees:view: may access only employees
 *   where the actor is Reporting Manager or Team Lead.
 * - No visibility permission: no employee records are accessible.
 */
export function getEmployeeVisibilityScope(actor: EmployeeAccessContext): EmployeeVisibilityScope {
  if (actor.isAdmin) return 'admin';
  if (actor.permissionKeys.includes('employees:view_all')) return 'all';
  if (
    actor.permissionKeys.includes('employees:view_assigned') ||
    actor.permissionKeys.includes('employees:view')
  ) {
    return 'assigned';
  }
  return 'none';
}
