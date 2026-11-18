'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  Appointment,
  AppointmentEvent,
  AppointmentService,
  AuditLog,
  Barber,
  BlockedTime,
  Branch,
  CashRegister,
  CashTransaction,
  Commission,
  CommissionRule,
  Coupon,
  Customer,
  Expense,
  InventoryMovement,
  LoyaltyAccount,
  NotificationJob,
  NotificationTemplate,
  Payment,
  Permission,
  Product,
  Refund,
  Review,
  Role,
  Service,
  SessionContext,
  Subscription,
  SubscriptionEvent,
  SubscriptionFeature,
  SubscriptionPlan,
  Supplier,
  Tenant,
  TenantSettings,
  WaitlistEntry,
  WorkingHour,
} from '@/lib/types/domain';
import type { BusinessIntelligenceSnapshot } from '@/lib/domain/intelligence';
import { hasPermission, type AppResource, type PermissionAction } from '@/lib/domain/permissions';

export interface WorkspaceState {
  session: SessionContext;
  tenant: Tenant;
  settings: TenantSettings;
  branches: Branch[];
  barbers: Barber[];
  services: Service[];
  workingHours: WorkingHour[];
  blockedTimes: BlockedTime[];
  customers: Customer[];
  appointments: Appointment[];
  appointmentServices: AppointmentService[];
  appointmentEvents: AppointmentEvent[];
  waitlistEntries: WaitlistEntry[];
  payments: Payment[];
  refunds: Refund[];
  commissionRules: CommissionRule[];
  commissions: Commission[];
  cashRegisters: CashRegister[];
  cashTransactions: CashTransaction[];
  expenses: Expense[];
  suppliers: Supplier[];
  products: Product[];
  inventoryMovements: InventoryMovement[];
  loyaltyAccounts: LoyaltyAccount[];
  coupons: Coupon[];
  reviews: Review[];
  notificationTemplates: NotificationTemplate[];
  notificationJobs: NotificationJob[];
  roles: Role[];
  permissions: Permission[];
  auditLogs: AuditLog[];
  subscription: Subscription;
  plan: SubscriptionPlan;
  allPlans: SubscriptionPlan[];
  planFeatures: SubscriptionFeature[];
  subscriptionEvents: SubscriptionEvent[];
  intelligence: BusinessIntelligenceSnapshot;
  integrationsStatus: {
    mercadopagoConfigured: boolean;
    whatsappConfigured: boolean;
    resendConfigured: boolean;
  };
}

interface WorkspaceContextValue {
  data: WorkspaceState | null;
  loading: boolean;
  error: string | null;
  selectedBranchId: string; // 'all' ou branch.id
  setSelectedBranchId: (id: string) => void;
  refresh: () => Promise<void>;
  can: (resource: AppResource, action?: PermissionAction) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function TenantWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<WorkspaceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  const refresh = useCallback(async () => {
    setLoading((prev) => (data ? prev : true));
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Não foi possível carregar os dados da barbearia.');
        return;
      }
      setData(json as WorkspaceState);
      setError(null);
    } catch {
      setError('Falha de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const can = useCallback(
    (resource: AppResource, action: PermissionAction = 'can_view') => {
      if (!data) return false;
      return hasPermission({
        roleCode: data.session.roleCode,
        resource,
        action,
        customPermissions: data.permissions,
        roleId: data.session.membership?.role_id,
      });
    },
    [data]
  );

  return (
    <WorkspaceContext.Provider
      value={{
        data,
        loading,
        error,
        selectedBranchId,
        setSelectedBranchId,
        refresh,
        can,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside TenantWorkspaceProvider');
  return ctx;
}
