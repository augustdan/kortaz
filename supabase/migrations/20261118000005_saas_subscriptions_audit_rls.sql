-- ============================================================================
-- Migration 0005: SaaS Monetização, Auditoria e Row Level Security (RLS)
-- ============================================================================

-- 34. subscription_plans
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('free', 'starter', 'pro', 'premium', 'business', 'enterprise')),
  name text not null,
  tagline text not null,
  price_monthly numeric(10,2) not null default 0,
  is_custom_pricing boolean not null default false,
  max_barbers integer,          -- NULL = ilimitado / sob consulta
  max_monthly_appointments integer,
  max_branches integer not null default 1,
  trial_days integer not null default 14,
  is_popular boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 35. subscription_features
create table if not exists public.subscription_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  feature_key text not null,
  label text not null,
  is_enabled boolean not null default true,
  unique (plan_id, feature_key)
);

-- 36. subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'cancelled', 'suspended')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  price_at_subscription numeric(10,2) not null default 0,
  coupon_code text,
  discount_amount numeric(10,2) not null default 0,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  external_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_tenant_id_idx on public.subscriptions (tenant_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);

-- 37. subscription_events
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'upgraded', 'downgraded', 'renewed', 'payment_failed', 'cancelled', 'suspended', 'reactivated')),
  from_plan_code text,
  to_plan_code text,
  amount numeric(10,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscription_events_tenant_idx on public.subscription_events (tenant_id, created_at);

-- 38. audit_logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  ip_address text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_tenant_idx on public.audit_logs (tenant_id, created_at desc);
create index if not exists audit_logs_severity_idx on public.audit_logs (severity, created_at desc);

-- ============================================================================
-- FUNÇÕES PRIVADAS PARA RLS MULTI-TENANT SEGURA
-- ============================================================================

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_super_admin = true
  );
$$;

create or replace function private.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_super_admin()) or exists (
    select 1 from public.memberships m
    where m.tenant_id = p_tenant_id
      and m.profile_id = (select auth.uid())
      and m.is_active = true
  );
$$;

create or replace function private.has_tenant_role(p_tenant_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_super_admin()) or exists (
    select 1 from public.memberships m
    where m.tenant_id = p_tenant_id
      and m.profile_id = (select auth.uid())
      and m.is_active = true
      and m.role_code = any(p_roles)
  );
$$;

revoke execute on function private.is_super_admin() from public, anon, authenticated;
revoke execute on function private.is_tenant_member(uuid) from public, anon, authenticated;
revoke execute on function private.has_tenant_role(uuid, text[]) from public, anon, authenticated;

-- ============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS E APLICAR POLÍTICAS RIGOROSAS
-- ============================================================================

do $$
declare
  tbl text;
  tenant_tables text[] := array[
    'tenant_settings', 'branches', 'roles', 'permissions', 'memberships',
    'customers', 'barbers', 'services', 'barber_services', 'working_hours',
    'blocked_times', 'appointments', 'appointment_services', 'appointment_events',
    'waitlist_entries', 'payments', 'refunds', 'commission_rules', 'commissions',
    'cash_registers', 'cash_transactions', 'expenses', 'suppliers', 'products',
    'service_product_consumptions', 'inventory_movements', 'loyalty_accounts',
    'loyalty_transactions', 'reviews', 'notification_templates',
    'notification_jobs', 'notification_logs', 'subscriptions', 'subscription_events'
  ];
begin
  execute 'alter table public.tenants enable row level security';
  execute 'alter table public.profiles enable row level security';
  execute 'alter table public.coupons enable row level security';
  execute 'alter table public.subscription_plans enable row level security';
  execute 'alter table public.subscription_features enable row level security';
  execute 'alter table public.audit_logs enable row level security';

  foreach tbl in array tenant_tables loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists tenant_isolation_select on public.%I', tbl);
    execute format(
      'create policy tenant_isolation_select on public.%I for select to authenticated using ((select private.is_tenant_member(tenant_id)))',
      tbl
    );
    execute format('drop policy if exists tenant_isolation_modify on public.%I', tbl);
    execute format(
      'create policy tenant_isolation_modify on public.%I for all to authenticated using ((select private.has_tenant_role(tenant_id, array[''OWNER'',''MANAGER'',''BARBER'',''RECEPTIONIST'']))) with check ((select private.has_tenant_role(tenant_id, array[''OWNER'',''MANAGER'',''BARBER'',''RECEPTIONIST''])))',
      tbl
    );
  end loop;
end $$;

-- Políticas específicas para tabelas públicas / globais / usuários
create policy tenants_public_select on public.tenants
  for select to anon, authenticated
  using (status in ('active', 'trialing') and deleted_at is null);

create policy tenants_owner_update on public.tenants
  for update to authenticated
  using ((select private.has_tenant_role(id, array['OWNER'])))
  with check ((select private.has_tenant_role(id, array['OWNER'])));

create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_super_admin()));

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy branches_public_select on public.branches
  for select to anon using (is_active = true and deleted_at is null);

create policy services_public_select on public.services
  for select to anon using (is_active = true and deleted_at is null);

create policy barbers_public_select on public.barbers
  for select to anon using (is_active = true and deleted_at is null);

create policy reviews_public_select on public.reviews
  for select to anon using (is_published = true);

create policy plans_public_select on public.subscription_plans
  for select to anon, authenticated using (is_active = true);

create policy plan_features_public_select on public.subscription_features
  for select to anon, authenticated using (true);

create policy plans_super_admin_all on public.subscription_plans
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

create policy coupons_select on public.coupons
  for select to authenticated
  using (
    scope = 'saas'
    or (tenant_id is not null and (select private.is_tenant_member(tenant_id)))
  );

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (
    (select private.is_super_admin())
    or (tenant_id is not null and (select private.has_tenant_role(tenant_id, array['OWNER', 'MANAGER'])))
  );
