-- ============================================================
-- B2B Ordering System — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES (extends Supabase auth.users) ─────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text not null default 'salesperson' check (role in ('admin', 'salesperson')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── PRODUCTS ────────────────────────────────────────────────
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  description text,
  photo_url text,
  cost_price numeric(10,2) not null default 0,
  price_multiplier numeric(5,2) not null default 3.0,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Authenticated users can manage products" on public.products for all using (auth.role() = 'authenticated');
create index on public.products (category);
create index on public.products (code);

-- ─── CUSTOMERS ───────────────────────────────────────────────
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  vat_number text,
  address text,
  tags text[] default '{}',
  notes text,
  created_at timestamptz not null default now()
);
alter table public.customers enable row level security;
create policy "Authenticated users can manage customers" on public.customers for all using (auth.role() = 'authenticated');
create index on public.customers using gin(tags);

-- ─── ORDERS ──────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id),
  salesperson_id uuid references public.profiles(id),
  total_price numeric(12,2) not null default 0,
  payment_status text not null default 'pending_deposit'
    check (payment_status in ('pending_deposit','deposit_received','paid','cancelled')),
  production_status text not null default 'to_prepare'
    check (production_status in ('to_prepare','in_progress','quality_check','ready_packaging','ready_ship','completed')),
  shipping_status text not null default 'pending'
    check (shipping_status in ('pending','shipped','delivered')),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "Authenticated users can manage orders" on public.orders for all using (auth.role() = 'authenticated');
create index on public.orders (customer_id);
create index on public.orders (payment_status);
create index on public.orders (production_status);
create index on public.orders (created_at desc);

-- Auto-generate order number
create or replace function public.generate_order_number()
returns trigger language plpgsql as $$
declare
  seq int;
begin
  select count(*) + 1 into seq from public.orders;
  new.order_number := 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 4, '0');
  return new;
end;
$$;
create trigger set_order_number
  before insert on public.orders
  for each row execute procedure public.generate_order_number();

-- ─── ORDER ITEMS ─────────────────────────────────────────────
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(12,2) not null
);
alter table public.order_items enable row level security;
create policy "Authenticated users can manage order items" on public.order_items for all using (auth.role() = 'authenticated');
create index on public.order_items (order_id);

-- ─── SUPPLIERS ───────────────────────────────────────────────
create table public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;
create policy "Authenticated users can manage suppliers" on public.suppliers for all using (auth.role() = 'authenticated');

-- ─── MATERIALS ───────────────────────────────────────────────
create table public.materials (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  unit text not null default 'pcs',
  cost_per_unit numeric(10,2) not null default 0,
  stock_quantity numeric(12,2) not null default 0,
  supplier_id uuid references public.suppliers(id),
  created_at timestamptz not null default now()
);
alter table public.materials enable row level security;
create policy "Authenticated users can manage materials" on public.materials for all using (auth.role() = 'authenticated');

-- ─── BILL OF MATERIALS ───────────────────────────────────────
create table public.bill_of_materials (
  product_id uuid not null references public.products(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  quantity_per_unit numeric(12,4) not null,
  primary key (product_id, material_id)
);
alter table public.bill_of_materials enable row level security;
create policy "Authenticated users can manage BOM" on public.bill_of_materials for all using (auth.role() = 'authenticated');

-- ─── STORAGE BUCKET FOR PRODUCT PHOTOS ───────────────────────
insert into storage.buckets (id, name, public) values ('product-photos', 'product-photos', true)
on conflict do nothing;
create policy "Authenticated users can upload product photos"
  on storage.objects for insert with check (bucket_id = 'product-photos' and auth.role() = 'authenticated');
create policy "Product photos are publicly readable"
  on storage.objects for select using (bucket_id = 'product-photos');
create policy "Authenticated users can update product photos"
  on storage.objects for update with check (bucket_id = 'product-photos' and auth.role() = 'authenticated');
create policy "Authenticated users can delete product photos"
  on storage.objects for delete using (bucket_id = 'product-photos' and auth.role() = 'authenticated');
