// ============================================================================
// BarberOS — Tipagem Completa do Domínio e das 38 Entidades do Banco
// ============================================================================

export type RoleCode =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'MANAGER'
  | 'BARBER'
  | 'RECEPTIONIST'
  | 'CUSTOMER';

export type PlanCode =
  | 'free'
  | 'starter'
  | 'pro'
  | 'premium'
  | 'business'
  | 'enterprise';

export type TenantStatus = 'active' | 'trialing' | 'suspended' | 'cancelled';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type AppointmentSource =
  | 'online'
  | 'admin'
  | 'mobile'
  | 'walk_in'
  | 'squeeze_in'
  | 'recurring';

export type PaymentMethod =
  | 'cash'
  | 'pix'
  | 'debit_card'
  | 'credit_card'
  | 'payment_link'
  | 'deposit'
  | 'partial'
  | 'combined';

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled';

export type NotificationTrigger =
  | 'appointment_confirmed'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'payment_approved'
  | 'customer_birthday'
  | 'customer_inactive'
  | 'review_request'
  | 'waitlist_slot_available';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  business_type?: 'barbershop' | 'salon' | 'unisex';
  document?: string;
  phone?: string;
  email?: string;
  logo_url: string;
  cover_url: string;
  description: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface TenantSettings {
  id: string;
  tenant_id: string;
  primary_color: string;
  accent_color: string;
  booking_auto_confirm: boolean;
  cancellation_policy_hours: number;
  require_deposit: boolean;
  deposit_percentage: number;
  loyalty_cuts_target: number;
  loyalty_reward_label: string;
  cashback_percent: number;
  inactive_days_threshold: number;
  whatsapp_enabled: boolean;
  mercadopago_enabled: boolean;
  google_calendar_enabled: boolean;
  lgpd_dpo_email: string;
  custom_public_headline: string;
  custom_public_subheadline: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  phone: string;
  timezone: string;
  opening_hours_label: string;
  is_headquarters: boolean;
  is_active: boolean;
  created_at: string;
  deleted_at?: string | null;
}

export interface Profile {
  id: string;
  email: string;
  password_hash: string; // PBKDF2 hash (nunca exposto para o frontend)
  full_name: string;
  phone?: string;
  avatar_url?: string;
  is_super_admin: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  tenant_id: string | null;
  code: RoleCode;
  name: string;
  description: string;
}

export interface Permission {
  id: string;
  role_id: string;
  tenant_id: string | null;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface Membership {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  profile_id: string;
  role_id: string;
  role_code: RoleCode;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  profile_id?: string | null;
  full_name: string;
  phone: string;
  email?: string;
  birth_date?: string;
  notes?: string;
  preferred_barber_id?: string | null;
  total_spent: number;
  visits_count: number;
  no_show_count: number;
  cancelled_count: number;
  last_visit_at?: string | null;
  marketing_opt_in: boolean;
  whatsapp_opt_in: boolean;
  lgpd_consent_at?: string | null;
  anonymized_at?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface Barber {
  id: string;
  tenant_id: string;
  branch_id: string;
  profile_id?: string | null;
  name: string;
  specialty: string;
  audience_focus?: 'male' | 'female' | 'unisex';
  bio?: string;
  avatar_url: string;
  phone?: string;
  email?: string;
  rating_avg: number;
  reviews_count: number;
  monthly_revenue_goal: number;
  default_commission_percent: number;
  is_active: boolean;
  created_at: string;
  deleted_at?: string | null;
}

export interface Service {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  name: string;
  description: string;
  category: string;
  audience?: 'male' | 'female' | 'unisex';
  duration_minutes: number;
  buffer_minutes: number;
  price: number;
  cost_estimate: number;
  image_url: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  deleted_at?: string | null;
}

export interface BarberService {
  id: string;
  tenant_id: string;
  barber_id: string;
  service_id: string;
  custom_duration_minutes?: number | null;
  custom_price?: number | null;
}

export interface WorkingHour {
  id: string;
  tenant_id: string;
  branch_id: string;
  barber_id: string;
  day_of_week: number; // 0 = Domingo ... 6 = Sábado
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  break_start?: string | null;
  break_end?: string | null;
  is_day_off: boolean;
}

export interface BlockedTime {
  id: string;
  tenant_id: string;
  branch_id: string;
  barber_id: string;
  reason: string;
  block_type: 'manual' | 'break' | 'day_off' | 'vacation';
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  branch_id: string;
  barber_id: string;
  customer_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  is_recurring: boolean;
  recurrence_rule?: string | null;
  total_duration_minutes: number;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  deposit_amount: number;
  coupon_code?: string | null;
  notes?: string;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface AppointmentService {
  id: string;
  tenant_id: string;
  appointment_id: string;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  buffer_minutes: number;
  price: number;
}

export interface AppointmentEvent {
  id: string;
  tenant_id: string;
  appointment_id: string;
  actor_profile_id?: string | null;
  event_type:
    | 'created'
    | 'confirmed'
    | 'rescheduled'
    | 'started'
    | 'completed'
    | 'cancelled'
    | 'no_show'
    | 'payment_linked';
  payload: Record<string, unknown>;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  tenant_id: string;
  branch_id: string;
  customer_id: string;
  barber_id?: string | null;
  service_id: string;
  desired_date: string; // YYYY-MM-DD
  desired_period: 'morning' | 'afternoon' | 'evening' | 'any';
  status: 'waiting' | 'notified' | 'booked' | 'expired';
  notified_at?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  branch_id: string;
  appointment_id?: string | null;
  customer_id?: string | null;
  provider: 'mercadopago' | 'manual';
  external_payment_id?: string | null;
  external_preference_id?: string | null;
  method: PaymentMethod;
  payment_type: 'full' | 'deposit' | 'partial' | 'remaining';
  gross_amount: number;
  provider_fee: number;
  refunded_amount: number;
  net_amount: number;
  status: PaymentStatus;
  pix_qr_code?: string | null;
  checkout_url?: string | null;
  paid_at?: string | null;
  webhook_verified_at?: string | null;
  created_at: string;
}

export interface Refund {
  id: string;
  tenant_id: string;
  payment_id: string;
  amount: number;
  reason: string;
  external_refund_id?: string | null;
  status: 'pending' | 'processed' | 'failed';
  processed_by?: string | null;
  created_at: string;
}

export interface CommissionRule {
  id: string;
  tenant_id: string;
  barber_id?: string | null;
  service_id?: string | null;
  product_id?: string | null;
  rule_scope:
    | 'barber_default'
    | 'barber_service'
    | 'service_global'
    | 'product_sale'
    | 'goal_bonus';
  commission_type: 'percentage' | 'fixed';
  value: number;
  goal_threshold?: number | null;
  bonus_amount?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Commission {
  id: string;
  tenant_id: string;
  branch_id: string;
  barber_id: string;
  appointment_id?: string | null;
  reference_label: string;
  source_type: 'service' | 'product' | 'goal_bonus' | 'adjustment';
  gross_base_amount: number;
  applied_rule_type: 'percentage' | 'fixed';
  applied_rule_value: number;
  commission_amount: number;
  adjustment_amount: number;
  adjustment_reason?: string | null;
  final_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at?: string | null;
  created_at: string;
}

export interface CashRegister {
  id: string;
  tenant_id: string;
  branch_id: string;
  opened_by?: string | null;
  closed_by?: string | null;
  opening_balance: number;
  expected_closing_balance: number;
  actual_closing_balance?: number | null;
  status: 'open' | 'closed';
  notes?: string;
  opened_at: string;
  closed_at?: string | null;
}

export interface CashTransaction {
  id: string;
  tenant_id: string;
  branch_id: string;
  cash_register_id: string;
  payment_id?: string | null;
  transaction_type:
    | 'income'
    | 'expense'
    | 'bleed'
    | 'supply'
    | 'commission_payout'
    | 'refund';
  method: string;
  amount: number;
  description: string;
  created_by?: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  tenant_id: string;
  branch_id: string;
  entry_kind: 'payable' | 'receivable';
  category: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at?: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  document?: string;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  branch_id: string;
  supplier_id?: string | null;
  name: string;
  sku?: string;
  category: string;
  usage_type: 'retail' | 'internal' | 'both';
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock_level: number;
  is_active: boolean;
  created_at: string;
  deleted_at?: string | null;
}

export interface ServiceProductConsumption {
  id: string;
  tenant_id: string;
  service_id: string;
  product_id: string;
  quantity_used: number;
}

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  branch_id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'service_consumption' | 'adjustment' | 'sale';
  quantity: number;
  unit_cost: number;
  reference_id?: string | null;
  reason: string;
  created_by?: string | null;
  created_at: string;
}

export interface LoyaltyAccount {
  id: string;
  tenant_id: string;
  customer_id: string;
  points_balance: number;
  stamps_balance: number;
  cashback_balance: number;
  referral_code: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  tenant_id: string;
  loyalty_account_id: string;
  transaction_type:
    | 'earn_points'
    | 'redeem_points'
    | 'earn_stamp'
    | 'redeem_reward'
    | 'earn_cashback'
    | 'use_cashback'
    | 'referral_bonus';
  points_delta: number;
  stamps_delta: number;
  cashback_delta: number;
  description: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  tenant_id: string | null;
  scope: 'tenant' | 'saas';
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number | null;
  used_count: number;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  tenant_id: string;
  branch_id: string;
  appointment_id: string;
  customer_id: string;
  barber_id: string;
  barber_rating: number;
  service_rating: number;
  ambience_rating: number;
  overall_rating: number;
  comment: string;
  is_published: boolean;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  tenant_id: string;
  trigger_event: NotificationTrigger;
  channel: 'whatsapp' | 'email' | 'both';
  title: string;
  body_template: string;
  is_active: boolean;
  updated_at: string;
}

export interface NotificationJob {
  id: string;
  tenant_id: string;
  customer_id?: string | null;
  appointment_id?: string | null;
  trigger_event: NotificationTrigger;
  channel: 'whatsapp' | 'email';
  recipient: string;
  rendered_message: string;
  status: 'queued' | 'sent' | 'failed' | 'integration_not_configured' | 'opted_out';
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  last_error?: string | null;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  tenant_id: string;
  job_id: string;
  provider: string;
  provider_message_id?: string | null;
  status: string;
  response_payload: Record<string, unknown>;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  code: PlanCode;
  name: string;
  tagline: string;
  price_monthly: number;
  is_custom_pricing: boolean;
  max_barbers: number | null;
  max_monthly_appointments: number | null;
  max_branches: number;
  trial_days: number;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface SubscriptionFeature {
  id: string;
  plan_id: string;
  feature_key: string;
  label: string;
  is_enabled: boolean;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'suspended';
  billing_cycle: 'monthly' | 'yearly';
  price_at_subscription: number;
  coupon_code?: string | null;
  discount_amount: number;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
}

export interface SubscriptionEvent {
  id: string;
  tenant_id: string;
  subscription_id: string;
  event_type:
    | 'created'
    | 'upgraded'
    | 'downgraded'
    | 'renewed'
    | 'payment_failed'
    | 'cancelled'
    | 'suspended'
    | 'reactivated';
  from_plan_code?: string | null;
  to_plan_code?: string | null;
  amount: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  actor_profile_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  severity: 'info' | 'warning' | 'critical';
  ip_address?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PasswordResetToken {
  token: string;
  email: string;
  expires_at: string;
  used_at?: string | null;
}

export interface PlatformSettings {
  platform_name: string;
  support_email: string;
  default_trial_days: number;
  mercadopago_fee_notice: string;
  whatsapp_fee_notice: string;
  maintenance_mode: boolean;
}

export interface DatabaseState {
  tenants: Tenant[];
  tenant_settings: TenantSettings[];
  branches: Branch[];
  profiles: Profile[];
  roles: Role[];
  permissions: Permission[];
  memberships: Membership[];
  customers: Customer[];
  barbers: Barber[];
  services: Service[];
  barber_services: BarberService[];
  working_hours: WorkingHour[];
  blocked_times: BlockedTime[];
  appointments: Appointment[];
  appointment_services: AppointmentService[];
  appointment_events: AppointmentEvent[];
  waitlist_entries: WaitlistEntry[];
  payments: Payment[];
  refunds: Refund[];
  commission_rules: CommissionRule[];
  commissions: Commission[];
  cash_registers: CashRegister[];
  cash_transactions: CashTransaction[];
  expenses: Expense[];
  suppliers: Supplier[];
  products: Product[];
  service_product_consumptions: ServiceProductConsumption[];
  inventory_movements: InventoryMovement[];
  loyalty_accounts: LoyaltyAccount[];
  loyalty_transactions: LoyaltyTransaction[];
  coupons: Coupon[];
  reviews: Review[];
  notification_templates: NotificationTemplate[];
  notification_jobs: NotificationJob[];
  notification_logs: NotificationLog[];
  subscription_plans: SubscriptionPlan[];
  subscription_features: SubscriptionFeature[];
  subscriptions: Subscription[];
  subscription_events: SubscriptionEvent[];
  audit_logs: AuditLog[];
  password_reset_tokens: PasswordResetToken[];
  platform_settings: PlatformSettings;
}

export interface SessionContext {
  profile: Omit<Profile, 'password_hash'>;
  membership: Membership | null;
  tenant: Tenant | null;
  roleCode: RoleCode;
}
