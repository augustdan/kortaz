-- ============================================================================
-- Migration 0002: Operação (Clientes, Barbeiros, Serviços, Agenda & Conflito)
-- ============================================================================

-- 8. customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text,
  birth_date date,
  notes text,
  preferred_barber_id uuid,
  total_spent numeric(12,2) not null default 0,
  visits_count integer not null default 0,
  no_show_count integer not null default 0,
  cancelled_count integer not null default 0,
  last_visit_at timestamptz,
  marketing_opt_in boolean not null default true,
  whatsapp_opt_in boolean not null default true,
  lgpd_consent_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists customers_tenant_id_idx on public.customers (tenant_id) where deleted_at is null;
create index if not exists customers_branch_id_idx on public.customers (branch_id);
create index if not exists customers_profile_id_idx on public.customers (profile_id);
create index if not exists customers_phone_idx on public.customers (tenant_id, phone);

-- 9. barbers
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  specialty text not null default 'Corte & Barba',
  bio text,
  avatar_url text,
  phone text,
  email text,
  rating_avg numeric(3,2) not null default 5.00,
  reviews_count integer not null default 0,
  monthly_revenue_goal numeric(12,2) not null default 5000.00,
  default_commission_percent numeric(5,2) not null default 50.00 check (default_commission_percent >= 0 and default_commission_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists barbers_tenant_id_idx on public.barbers (tenant_id) where deleted_at is null;
create index if not exists barbers_branch_id_idx on public.barbers (branch_id);
create index if not exists barbers_profile_id_idx on public.barbers (profile_id);

-- 10. services
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  category text not null default 'Cabelo',
  duration_minutes integer not null check (duration_minutes > 0),
  buffer_minutes integer not null default 0 check (buffer_minutes >= 0),
  price numeric(10,2) not null check (price >= 0),
  cost_estimate numeric(10,2) not null default 0,
  image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists services_tenant_id_idx on public.services (tenant_id) where deleted_at is null;
create index if not exists services_branch_id_idx on public.services (branch_id);

-- 11. barber_services
create table if not exists public.barber_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  custom_duration_minutes integer,
  custom_price numeric(10,2),
  created_at timestamptz not null default now(),
  unique (barber_id, service_id)
);

create index if not exists barber_services_tenant_id_idx on public.barber_services (tenant_id);
create index if not exists barber_services_barber_id_idx on public.barber_services (barber_id);
create index if not exists barber_services_service_id_idx on public.barber_services (service_id);

-- 12. working_hours
create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  is_day_off boolean not null default false,
  created_at timestamptz not null default now(),
  unique (barber_id, day_of_week)
);

create index if not exists working_hours_tenant_id_idx on public.working_hours (tenant_id);
create index if not exists working_hours_barber_id_idx on public.working_hours (barber_id);

-- 13. blocked_times (Folgas, Férias, Bloqueios manuais)
create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  reason text not null default 'Bloqueio de agenda',
  block_type text not null default 'manual' check (block_type in ('manual', 'break', 'day_off', 'vacation')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists blocked_times_tenant_id_idx on public.blocked_times (tenant_id);
create index if not exists blocked_times_barber_range_idx on public.blocked_times (barber_id, starts_at, ends_at);

-- 14. appointments (Com constraint de exclusão PostgreSQL anti-conflito / race condition!)
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  source text not null default 'online' check (source in ('online', 'admin', 'mobile', 'walk_in', 'squeeze_in', 'recurring')),
  is_recurring boolean not null default false,
  recurrence_rule text,
  total_duration_minutes integer not null check (total_duration_minutes > 0),
  subtotal_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  coupon_code text,
  notes text,
  cancellation_reason text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ends_at > starts_at)
);

-- Prevenção absoluta de agendamento duplo / condição de corrida no nível do PostgreSQL
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_no_barber_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_no_barber_overlap
      exclude using gist (
        barber_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status not in ('cancelled', 'no_show') and deleted_at is null);
  end if;
end $$;

create index if not exists appointments_tenant_id_idx on public.appointments (tenant_id, starts_at);
create index if not exists appointments_branch_id_idx on public.appointments (branch_id, starts_at);
create index if not exists appointments_barber_id_idx on public.appointments (barber_id, starts_at);
create index if not exists appointments_customer_id_idx on public.appointments (customer_id);

-- 15. appointment_services (Snapshot dos serviços no momento do agendamento)
create table if not exists public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  service_name text not null,
  duration_minutes integer not null,
  buffer_minutes integer not null default 0,
  price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists appointment_services_tenant_id_idx on public.appointment_services (tenant_id);
create index if not exists appointment_services_appointment_id_idx on public.appointment_services (appointment_id);
create index if not exists appointment_services_service_id_idx on public.appointment_services (service_id);

-- 16. appointment_events (Histórico imutável de alterações do agendamento)
create table if not exists public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('created', 'confirmed', 'rescheduled', 'started', 'completed', 'cancelled', 'no_show', 'payment_linked')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists appointment_events_tenant_id_idx on public.appointment_events (tenant_id);
create index if not exists appointment_events_appointment_id_idx on public.appointment_events (appointment_id);

-- Lista de espera automática
create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  barber_id uuid references public.barbers(id) on delete set null,
  service_id uuid not null references public.services(id) on delete cascade,
  desired_date date not null,
  desired_period text not null default 'any' check (desired_period in ('morning', 'afternoon', 'evening', 'any')),
  status text not null default 'waiting' check (status in ('waiting', 'notified', 'booked', 'expired')),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_entries_tenant_date_idx on public.waitlist_entries (tenant_id, desired_date, status);
