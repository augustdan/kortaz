-- ============================================================================
-- Migration 0003: Financeiro, Pagamentos, Comissões e Caixa
-- ============================================================================

-- 17. payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  provider text not null default 'manual' check (provider in ('mercadopago', 'manual')),
  external_payment_id text,
  external_preference_id text,
  method text not null check (method in ('cash', 'pix', 'debit_card', 'credit_card', 'payment_link', 'deposit', 'partial', 'combined')),
  payment_type text not null default 'full' check (payment_type in ('full', 'deposit', 'partial', 'remaining')),
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  provider_fee numeric(12,2) not null default 0 check (provider_fee >= 0),
  refunded_amount numeric(12,2) not null default 0 check (refunded_amount >= 0),
  net_amount numeric(12,2) generated always as (gross_amount - provider_fee - refunded_amount) stored,
  status text not null default 'pending' check (status in ('pending', 'approved', 'failed', 'refunded', 'partially_refunded', 'cancelled')),
  pix_qr_code text,
  pix_qr_code_base64 text,
  checkout_url text,
  paid_at timestamptz,
  webhook_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_tenant_id_idx on public.payments (tenant_id, created_at);
create index if not exists payments_branch_id_idx on public.payments (branch_id);
create index if not exists payments_appointment_id_idx on public.payments (appointment_id);
create index if not exists payments_external_id_idx on public.payments (external_payment_id);

-- 18. refunds
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  external_refund_id text,
  status text not null default 'processed' check (status in ('pending', 'processed', 'failed')),
  processed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists refunds_tenant_id_idx on public.refunds (tenant_id);
create index if not exists refunds_payment_id_idx on public.refunds (payment_id);

-- 19. commission_rules
create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  barber_id uuid references public.barbers(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  product_id uuid,
  rule_scope text not null check (rule_scope in ('barber_default', 'barber_service', 'service_global', 'product_sale', 'goal_bonus')),
  commission_type text not null check (commission_type in ('percentage', 'fixed')),
  value numeric(10,2) not null check (value >= 0),
  goal_threshold numeric(12,2),
  bonus_amount numeric(10,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commission_rules_tenant_id_idx on public.commission_rules (tenant_id);
create index if not exists commission_rules_barber_id_idx on public.commission_rules (barber_id);

-- 20. commissions (Snapshot histórico imutável no momento do atendimento)
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  reference_label text not null,
  source_type text not null check (source_type in ('service', 'product', 'goal_bonus', 'adjustment')),
  gross_base_amount numeric(12,2) not null,
  applied_rule_type text not null check (applied_rule_type in ('percentage', 'fixed')),
  applied_rule_value numeric(10,2) not null,
  commission_amount numeric(12,2) not null,
  adjustment_amount numeric(12,2) not null default 0,
  adjustment_reason text,
  final_amount numeric(12,2) generated always as (commission_amount + adjustment_amount) stored,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  settlement_batch_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists commissions_tenant_id_idx on public.commissions (tenant_id, status);
create index if not exists commissions_barber_id_idx on public.commissions (barber_id, created_at);
create index if not exists commissions_branch_id_idx on public.commissions (branch_id);

-- 21. cash_registers
create table if not exists public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  opened_by uuid references public.profiles(id) on delete set null,
  closed_by uuid references public.profiles(id) on delete set null,
  opening_balance numeric(12,2) not null default 0,
  expected_closing_balance numeric(12,2) not null default 0,
  actual_closing_balance numeric(12,2),
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists cash_registers_tenant_branch_idx on public.cash_registers (tenant_id, branch_id, status);

-- 22. cash_transactions (Entradas, saídas, sangrias, suprimentos)
create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  cash_register_id uuid not null references public.cash_registers(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  transaction_type text not null check (transaction_type in ('income', 'expense', 'bleed', 'supply', 'commission_payout', 'refund')),
  method text not null default 'cash',
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cash_transactions_tenant_id_idx on public.cash_transactions (tenant_id, created_at);
create index if not exists cash_transactions_register_idx on public.cash_transactions (cash_register_id);

-- 23. expenses (Contas a pagar / receber)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  entry_kind text not null default 'payable' check (entry_kind in ('payable', 'receivable')),
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists expenses_tenant_branch_idx on public.expenses (tenant_id, branch_id, due_date);
