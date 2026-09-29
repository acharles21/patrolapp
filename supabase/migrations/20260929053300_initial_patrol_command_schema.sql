-- Patrol Command initial schema
-- This mirrors the initial schema applied to project ytfzkzgdshroudkbzerz.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  call_sign text,
  rank_title text,
  role text not null default 'officer' check (role in ('officer','patrol','dispatcher','supervisor','admin')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  address text,
  city text,
  state text default 'NV',
  postal_code text,
  primary_contact_name text,
  primary_contact_phone text,
  emergency_notes text,
  access_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_account_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, account_id)
);

create table if not exists public.post_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  content text not null,
  version integer not null default 1,
  is_published boolean not null default false,
  effective_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  content_type text not null default 'link' check (content_type in ('link','document','video','text')),
  url text,
  body text,
  is_required boolean not null default false,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_number text unique,
  description text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete set null,
  asset_tag text unique,
  name text not null,
  device_type text not null check (device_type in ('mdt','tablet','phone','radio','router','hotspot','camera','other')),
  manufacturer text,
  model text,
  serial_number text,
  carrier text,
  status text not null default 'active' check (status in ('active','issue','repair','retired')),
  notes text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tech_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  shop_id uuid references public.shops(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  category text not null default 'other' check (category in ('login_access','connectivity','mdt','tablet','radio','software','hardware','permissions','other')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  status text not null default 'open' check (status in ('open','triage','in_progress','waiting','resolved','closed')),
  title text not null,
  description text not null,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tech_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  audience text not null default 'all' check (audience in ('all','officer','patrol','dispatcher','supervisor','admin')),
  is_published boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS policies and helper functions are applied in the live project.
-- Keep future schema changes in new migration files rather than editing this historical migration.
