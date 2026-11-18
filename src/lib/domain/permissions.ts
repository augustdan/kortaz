import type { Permission, RoleCode } from '@/lib/types/domain';

export type AppResource =
  | 'dashboard'
  | 'agenda'
  | 'appointments'
  | 'customers'
  | 'barbers'
  | 'services'
  | 'financial'
  | 'commissions'
  | 'inventory'
  | 'marketing'
  | 'reports'
  | 'settings'
  | 'subscription'
  | 'super_admin';

export type PermissionAction = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

export const DEFAULT_ROLE_MATRIX: Record<
  RoleCode,
  Record<AppResource, { view: boolean; create: boolean; edit: boolean; delete: boolean }>
> = {
  SUPER_ADMIN: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    agenda: { view: true, create: true, edit: true, delete: true },
    appointments: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: true },
    barbers: { view: true, create: true, edit: true, delete: true },
    services: { view: true, create: true, edit: true, delete: true },
    financial: { view: true, create: true, edit: true, delete: true },
    commissions: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    marketing: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    subscription: { view: true, create: true, edit: true, delete: true },
    super_admin: { view: true, create: true, edit: true, delete: true },
  },
  OWNER: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    agenda: { view: true, create: true, edit: true, delete: true },
    appointments: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: true },
    barbers: { view: true, create: true, edit: true, delete: true },
    services: { view: true, create: true, edit: true, delete: true },
    financial: { view: true, create: true, edit: true, delete: true },
    commissions: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    marketing: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    subscription: { view: true, create: true, edit: true, delete: true },
    super_admin: { view: false, create: false, edit: false, delete: false },
  },
  MANAGER: {
    dashboard: { view: true, create: true, edit: true, delete: false },
    agenda: { view: true, create: true, edit: true, delete: true },
    appointments: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: false },
    barbers: { view: true, create: true, edit: true, delete: false },
    services: { view: true, create: true, edit: true, delete: false },
    financial: { view: true, create: true, edit: true, delete: false },
    commissions: { view: true, create: false, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false },
    marketing: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    subscription: { view: true, create: false, edit: false, delete: false },
    super_admin: { view: false, create: false, edit: false, delete: false },
  },
  BARBER: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    agenda: { view: true, create: true, edit: true, delete: false },
    appointments: { view: true, create: true, edit: true, delete: false },
    customers: { view: true, create: false, edit: false, delete: false },
    barbers: { view: true, create: false, edit: false, delete: false },
    services: { view: true, create: false, edit: false, delete: false },
    financial: { view: false, create: false, edit: false, delete: false },
    commissions: { view: true, create: false, edit: false, delete: false },
    inventory: { view: true, create: false, edit: false, delete: false },
    marketing: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    subscription: { view: false, create: false, edit: false, delete: false },
    super_admin: { view: false, create: false, edit: false, delete: false },
  },
  RECEPTIONIST: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    agenda: { view: true, create: true, edit: true, delete: false },
    appointments: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: false },
    barbers: { view: true, create: false, edit: false, delete: false },
    services: { view: true, create: false, edit: false, delete: false },
    financial: { view: true, create: true, edit: false, delete: false },
    commissions: { view: false, create: false, edit: false, delete: false },
    inventory: { view: true, create: false, edit: false, delete: false },
    marketing: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    subscription: { view: false, create: false, edit: false, delete: false },
    super_admin: { view: false, create: false, edit: false, delete: false },
  },
  CUSTOMER: {
    dashboard: { view: false, create: false, edit: false, delete: false },
    agenda: { view: false, create: false, edit: false, delete: false },
    appointments: { view: true, create: true, edit: false, delete: true },
    customers: { view: false, create: false, edit: false, delete: false },
    barbers: { view: false, create: false, edit: false, delete: false },
    services: { view: false, create: false, edit: false, delete: false },
    financial: { view: false, create: false, edit: false, delete: false },
    commissions: { view: false, create: false, edit: false, delete: false },
    inventory: { view: false, create: false, edit: false, delete: false },
    marketing: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    subscription: { view: false, create: false, edit: false, delete: false },
    super_admin: { view: false, create: false, edit: false, delete: false },
  },
};

export function hasPermission(params: {
  roleCode: RoleCode;
  resource: AppResource;
  action: PermissionAction;
  customPermissions?: Permission[];
  roleId?: string | null;
}): boolean {
  const { roleCode, resource, action, customPermissions = [], roleId } = params;

  if (roleCode === 'SUPER_ADMIN') return true;

  if (roleId) {
    const custom = customPermissions.find((p) => p.role_id === roleId && p.resource === resource);
    if (custom) {
      return Boolean(custom[action]);
    }
  }

  const rule = DEFAULT_ROLE_MATRIX[roleCode]?.[resource];
  if (!rule) return false;

  switch (action) {
    case 'can_view':
      return rule.view;
    case 'can_create':
      return rule.create;
    case 'can_edit':
      return rule.edit;
    case 'can_delete':
      return rule.delete;
  }
}

export function assertPermission(params: {
  roleCode: RoleCode;
  resource: AppResource;
  action: PermissionAction;
  customPermissions?: Permission[];
  roleId?: string | null;
}): { allowed: boolean; error?: string } {
  const allowed = hasPermission(params);
  if (!allowed) {
    return {
      allowed: false,
      error: `Permissão insuficiente: perfil ${params.roleCode} não tem acesso (${params.action}) ao módulo ${params.resource}.`,
    };
  }
  return { allowed: true };
}
