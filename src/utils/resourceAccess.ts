export interface ResourceAccessContext {
  id: string;
  isAdmin: boolean;
  permissionKeys: string[];
}

export type ResourceVisibilityScope = 'admin' | 'all' | 'assigned' | 'none';

function getScope(actor: ResourceAccessContext, module: 'projects' | 'tasks'): ResourceVisibilityScope {
  if (actor.isAdmin) return 'admin';
  if (actor.permissionKeys.includes(`${module}:view_all`)) return 'all';
  if (
    actor.permissionKeys.includes(`${module}:view_assigned`) ||
    actor.permissionKeys.includes(`${module}:view`)
  ) {
    return 'assigned';
  }
  return 'none';
}

export function getProjectVisibilityScope(actor: ResourceAccessContext): ResourceVisibilityScope {
  return getScope(actor, 'projects');
}

export function getTaskVisibilityScope(actor: ResourceAccessContext): ResourceVisibilityScope {
  return getScope(actor, 'tasks');
}

export function canViewAllWorkTime(actor: ResourceAccessContext): boolean {
  return actor.isAdmin || (actor.permissionKeys.includes('projects:view_all') && actor.permissionKeys.includes('tasks:view_all'));
}
