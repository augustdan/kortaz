-- ============================================================================
-- Migration 0004: Estoque, Fidelidade, Cupons, Avaliações e Automações
-- ============================================================================

-- 24. suppliers
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  document text,
  created_at timestamptz not null default now()
);

create index if not exists suppliers_tenant_id_idx on public.suppliers (tenant_id);

-- 25. products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  sku text,
  category text not null default 'Finalizadores',
  usage_type text not null default 'both' check (usage_type in ('retail', 'internal', 'both')),
  cost_price numeric(10,2) not null default 0,
  sale_price numeric(10,2) not null default 0,
  stock_quantity integer not null default 0,
  min_stock_level integer not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists products_tenant_branch_idx on public.products (tenant_id, branch_id) where deleted_at is null;
create index if not exists products_supplier_id_idx on public.products (supplier_id);

-- Consumo de produtos vinculado a serviços
create table if not exists public.service_product_consumptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity_used numeric(8,2) not null default 1 check (quantity_used > 0),
  unique (service_id, product_id)
);

-- 26. inventory_movements
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'service_consumption', 'adjustment', 'sale')),
  quantity integer not null,
  unit_cost numeric(10,2) not null default 0,
  reference_id uuid,
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_tenant_idx on public.inventory_movements (tenant_id, created_at);
create index if not exists inventory_movements_product_idx on public.inventory_movements (product_id);

-- 27. loyalty_accounts
create table if not exists public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  points_balance integer not null default 0,
  stamps_balance integer not null default 0,
  cashback_balance numeric(10,2) not null default 0,
  referral_code text not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, customer_id)
);

create index if not exists loyalty_accounts_tenant_idx on public.loyalty_accounts (tenant_id);

-- 28. loyalty_transactions
create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('earn_points', 'redeem_points', 'earn_stamp', 'redeem_reward', 'earn_cashback', 'use_cashback', 'referral_bonus')),
  points_delta integer not null default 0,
  stamps_delta integer not null default 0,
  cashback_delta numeric(10,2) not null default 0,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists loyalty_transactions_account_idx on public.loyalty_transactions (loyalty_account_id);

-- 29. coupons (Tenant + Globais SaaS quando tenant_id IS NULL)
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  scope text not null default 'tenant' check (scope in ('tenant', 'saas')),
  code text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_uses integer,
  used_count integer not null default 0,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists coupons_unique_code_idx on public.coupons (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), upper(code));

-- 30. reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  barber_rating smallint not null check (barber_rating between 1 and 5),
  service_rating smallint not null check (service_rating between 1 and 5),
  ambience_rating smallint not null check (ambience_rating between 1 and 5),
  overall_rating smallint not null check (overall_rating between 1 and 5),
  comment text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists reviews_tenant_idx on public.reviews (tenant_id, created_at);
create index if not exists reviews_barber_idx on public.reviews (barber_id);

-- 31. notification_templates
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  trigger_event text not null check (trigger_event in (
    'appointment_confirmed',
    'reminder_24h',
    'reminder_2h',
    'appointment_cancelled',
    'appointment_rescheduled',
    'payment_approved',
    'customer_birthday',
    'customer_inactive',
    'review_request',
    'waitlist_slot_available'
  )),
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'email', 'both')),
  title text not null,
  body_template text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (tenant_id, trigger_event)
);

-- 32. notification_jobs
create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  trigger_event text not null,
  channel text not null check (channel in ('whatsapp', 'email')),
  recipient text not null,
  rendered_message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'integration_not_configured', 'opted_out')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  scheduled_for timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists notification_jobs_tenant_status_idx on public.notification_jobs (tenant_id, status, scheduled_for);

-- 33. notification_logs
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  job_id uuid not null references public.notification_jobs(id) on delete cascade,
  provider text not null,
  provider_message_id text,
  status text not null,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notification_logs_tenant_idx on public.notification_logs (tenant_id, created_at);
