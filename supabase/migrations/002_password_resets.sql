-- ============================================================
-- Shipedo — Password reset tokens
-- One row per reset request. Token is the random secret in the
-- email link. Used = consumed; expires_at = 1 hour from creation.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.password_resets (
  id          uuid primary key default gen_random_uuid(),
  token       text        not null unique,
  email       text        not null,
  role        text        not null check (role in ('seller','agent')),
  user_id     text        not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists password_resets_token_idx
  on public.password_resets (token);

create index if not exists password_resets_email_idx
  on public.password_resets (email, created_at desc);

alter table public.password_resets enable row level security;

drop policy if exists "password_resets_admin_all" on public.password_resets;
create policy "password_resets_admin_all"
  on public.password_resets
  for all
  to service_role
  using (true)
  with check (true);
