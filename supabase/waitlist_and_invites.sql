-- ============================================================
-- Waitlist + Invite system
-- Run in Supabase SQL editor
-- ============================================================

-- ─── Waitlist (request access form submissions) ───────────────
create table if not exists public.waitlist (
  id           uuid primary key default uuid_generate_v4(),
  email        text not null unique,
  company_name text not null,
  contact_name text not null default '',
  phone        text not null default '',
  status       text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'invited')),
  notes        text,
  created_at   timestamptz not null default now()
);
alter table public.waitlist enable row level security;
-- Only service role can access (admin only via API)
create policy "Service role only" on public.waitlist
  for all using (false);  -- blocked for all anon/user roles

-- ─── Invites ─────────────────────────────────────────────────
create table if not exists public.invites (
  id           uuid primary key default uuid_generate_v4(),
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  email        text not null,
  company_name text not null,
  company_id   uuid references public.companies(id),
  created_by   uuid references public.profiles(id),
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '72 hours'),
  created_at   timestamptz not null default now()
);
alter table public.invites enable row level security;
-- Admins can manage invites
create policy "Admins manage invites" on public.invites
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
-- Public can read their own invite by token (for the /invite page)
create policy "Anyone can read invite by token" on public.invites
  for select using (true);

create index if not exists invites_token_idx on public.invites(token);
create index if not exists invites_email_idx on public.invites(email);
