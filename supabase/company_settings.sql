-- Run this in your Supabase SQL editor (after schema.sql)
create table if not exists public.company_settings (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null default '',
  afm            text not null default '',
  doy            text not null default '',
  address        text not null default '',
  phone          text not null default '',
  email          text not null default '',
  bank_name      text not null default '',
  iban           text not null default '',
  swift          text not null default '',
  deposit_rate   numeric(5,2) not null default 50,
  invoice_prefix text not null default 'ORD',
  sender_email   text not null default '',
  sender_name    text not null default 'RelayDeck Orders',
  created_at     timestamptz not null default now()
);

alter table public.company_settings enable row level security;
create policy "Authenticated users can manage settings"
  on public.company_settings for all using (auth.role() = 'authenticated');
