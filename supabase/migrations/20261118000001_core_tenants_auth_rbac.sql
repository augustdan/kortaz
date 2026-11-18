-- ============================================================================
-- Migration 0001: Extensões, Schema Privado, Multi-Tenancy, Auth e RBAC
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- Schema privado não exposto via PostgREST para funções auxiliares seguras
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 1. tenants
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  document text,
  phone text,
  email text,
  logo_url text,
  cover_url text,
  description text,
  status text not null default 'active' check (status in ('active', 'trialing', 'suspended', 'cancelled')),
  is_super_admin_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists tenants_slug_idx on public.tenants (slug) where deleted_at is null;
create index if not exists tenants_status_idx on public.tenants (status);

-- 2. tenant_settings
create table if not exists public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  primary_color text not null default '#0B0B0B',
  accent_color text not null default '#C9A063',
  booking_auto_confirm boolean not null default true,
  cancellation_policy_hours integer not null default 4 check (cancellation_policy_hours >= 0),
  require_deposit boolean not null default false,
  deposit_percentage numeric(5,2) not null default 0 check (deposit_percentage >= 0 and deposit_percentage <= 100),
  loyalty_cuts_target integer not null default 10 check (loyalty_cuts_target > 0),
  loyalty_reward_label text not null default 'Corte Tradicional Cortesia',
  cashback_percent numeric(5,2) not null default 5 check (cashback_percent >= 0 and cashback_percent <= 100),
  inactive_days_threshold integer not null default 45 check (inactive_days_threshold > 0),
  whatsapp_enabled boolean not null default false,
  mercadopago_enabled boolean not null default false,
  google_calendar_enabled boolean not null default false,
  lgpd_dpo_email text not null default 'privacidade@barberos.com.br',
  custom_public_headline text not null default 'Seu estilo, nossa paixão.',
  custom_public_subheadline text not null default 'Agende seu horário e viva a melhor experiência de barbearia.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_settings_tenant_id_idx on public.tenant_settings (tenant_id);

-- 3. branches (Multiunidades)
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  address text not null,
  city text not null,
  state text not null,
  zip_code text,
  phone text,
  timezone text not null default 'America/Sao_Paulo',
  opening_hours_label text not null default 'SEG - SÁB: 09h às 20h',
  is_headquarters boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, slug)
);

create index if not exists branches_tenant_id_idx on public.branches (tenant_id) where deleted_at is null;

-- 4. profiles (vinculado a auth.users no Supabase)
create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  full_name text not null,
  phone text,
  avatar_url text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. roles (Perfis configuráveis por tenant ou globais)
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  code text not null check (code in ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'BARBER', 'RECEPTIONIST', 'CUSTOMER')),
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index if not exists roles_tenant_id_idx on public.roles (tenant_id);

-- 6. permissions (Permissões granulares configuráveis)
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  resource text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  unique (role_id, resource)
);

create index if not exists permissions_role_id_idx on public.permissions (role_id);
create index if not exists permissions_tenant_id_idx on public.permissions (tenant_id);

-- 7. memberships (Vínculo usuário <-> tenant <-> filial <-> cargo)
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  role_code text not null check (role_code in ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'BARBER', 'RECEPTIONIST', 'CUSTOMER')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, profile_id)
);

create index if not exists memberships_tenant_id_idx on public.memberships (tenant_id);
create index if not exists memberships_profile_id_idx on public.memberships (profile_id);
create index if not exists memberships_branch_id_idx on public.memberships (branch_id);
create index if not exists memberships_role_id_idx on public.memberships (role_id);

-- Função helper de trigger updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
