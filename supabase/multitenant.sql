-- ============================================================
-- Multi-tenant migration
-- Run in Supabase SQL editor AFTER schema.sql + company_settings.sql
-- One Supabase project → unlimited companies → $25/month total
-- ============================================================

-- ─── 1. Companies table ──────────────────────────────────────
create table if not exists public.companies (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  slug         text not null unique,      -- used in URLs / login
  plan         text not null default 'trial' check (plan in ('trial','starter','pro')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.companies enable row level security;
-- Only authenticated users of that company can read their own row
create policy "Company members can read own company"
  on public.companies for select
  using (id = (auth.jwt() ->> 'company_id')::uuid);

-- ─── 2. Extend profiles with company_id ──────────────────────
alter table public.profiles add column if not exists company_id uuid references public.companies(id);
create index if not exists profiles_company_id_idx on public.profiles(company_id);

-- Helper: get current user's company_id from JWT claim
create or replace function public.my_company_id()
returns uuid language sql stable security definer as $$
  select (auth.jwt() ->> 'company_id')::uuid
$$;

-- ─── 3. Add company_id to every data table ───────────────────
alter table public.products   add column if not exists company_id uuid references public.companies(id);
alter table public.customers  add column if not exists company_id uuid references public.companies(id);
alter table public.orders     add column if not exists company_id uuid references public.companies(id);
alter table public.order_items add column if not exists company_id uuid references public.companies(id);
alter table public.suppliers  add column if not exists company_id uuid references public.companies(id);
alter table public.materials  add column if not exists company_id uuid references public.companies(id);
alter table public.bill_of_materials add column if not exists company_id uuid references public.companies(id);
alter table public.company_settings  add column if not exists company_id uuid references public.companies(id);

-- Indexes for performance
create index if not exists products_company_idx    on public.products(company_id);
create index if not exists customers_company_idx   on public.customers(company_id);
create index if not exists orders_company_idx      on public.orders(company_id);
create index if not exists suppliers_company_idx   on public.suppliers(company_id);

-- ─── 4. Drop old permissive RLS policies ─────────────────────
drop policy if exists "Authenticated users can manage products"   on public.products;
drop policy if exists "Authenticated users can manage customers"  on public.customers;
drop policy if exists "Authenticated users can manage orders"     on public.orders;
drop policy if exists "Authenticated users can manage order items" on public.order_items;
drop policy if exists "Authenticated users can manage suppliers"  on public.suppliers;
drop policy if exists "Authenticated users can manage materials"  on public.materials;
drop policy if exists "Authenticated users can manage BOM"        on public.bill_of_materials;
drop policy if exists "Authenticated users can manage settings"   on public.company_settings;

-- ─── 5. New tenant-scoped RLS policies ───────────────────────
-- Products
create policy "Tenant: products" on public.products for all
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- Customers
create policy "Tenant: customers" on public.customers for all
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- Orders
create policy "Tenant: orders" on public.orders for all
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- Order items
create policy "Tenant: order_items" on public.order_items for all
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- Suppliers
create policy "Tenant: suppliers" on public.suppliers for all
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- Materials
create policy "Tenant: materials" on public.materials for all
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- BOM
create policy "Tenant: bom" on public.bill_of_materials for all
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- Settings (one row per company)
create policy "Tenant: settings" on public.company_settings for all
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- ─── 6. Auto-stamp company_id on INSERT via trigger ──────────
-- This means your app code never needs to manually pass company_id
create or replace function public.stamp_company_id()
returns trigger language plpgsql security definer as $$
begin
  new.company_id := public.my_company_id();
  return new;
end;
$$;

do $$ declare t text;
begin
  foreach t in array array[
    'products','customers','orders','order_items',
    'suppliers','materials','bill_of_materials','company_settings'
  ] loop
    execute format(
      'drop trigger if exists stamp_company_%I on public.%I;
       create trigger stamp_company_%I
         before insert on public.%I
         for each row execute procedure public.stamp_company_id();',
      t, t, t, t
    );
  end loop;
end $$;

-- ─── 7. Company registration function (call from your API) ───
create or replace function public.register_company(
  p_company_name text,
  p_slug         text,
  p_user_id      uuid,
  p_full_name    text
) returns uuid language plpgsql security definer as $$
declare
  v_company_id uuid;
begin
  -- Create company
  insert into public.companies (name, slug)
  values (p_company_name, p_slug)
  returning id into v_company_id;

  -- Update profile with company_id
  update public.profiles
  set company_id = v_company_id, role = 'admin', full_name = p_full_name
  where id = p_user_id;

  -- Seed default company settings
  insert into public.company_settings (company_id, name)
  values (v_company_id, p_company_name);

  return v_company_id;
end;
$$;

-- ─── 8. Set company_id in JWT via Supabase hook ──────────────
-- In Supabase Dashboard → Authentication → Hooks → Custom Access Token
-- Add this function as the hook:
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer as $$
declare
  v_company_id uuid;
  v_role text;
begin
  select company_id, role
  into v_company_id, v_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  return jsonb_set(
    jsonb_set(event, '{claims, company_id}', to_jsonb(v_company_id::text)),
    '{claims, user_role}', to_jsonb(v_role)
  );
end;
$$;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
