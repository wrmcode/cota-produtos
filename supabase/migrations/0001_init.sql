-- ============================================================
-- Cota Produtos — schema inicial
-- Rode este arquivo no SQL Editor do Supabase (ou via supabase db push)
-- ============================================================

create extension if not exists "unaccent";

-- ---------- Enums ----------
create type public.user_role as enum ('admin', 'supplier', 'customer');

-- ---------- Perfis (1:1 com auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'customer',
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

-- Cria o perfil automaticamente ao criar o usuário (convite ou signup).
-- role e full_name vêm de raw_user_meta_data (enviados no convite pelo admin).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer'),
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: papel do usuário logado (security definer evita recursão no RLS)
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- ---------- Fornecedores ----------
create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null unique references public.profiles (id) on delete cascade,
  name            text not null,                      -- ex.: Alvorada Norte
  supplier_type   text,                               -- Açougue, Hortifruti, Distribuidora...
  min_order_kg    numeric(10, 2) check (min_order_kg is null or min_order_kg >= 0),
  min_order_brl   numeric(12, 2) check (min_order_brl is null or min_order_brl >= 0),
  payment_terms   text,                               -- ex.: 7 dias, boleto
  seller_name     text,                               -- vendedor que envia a cotação
  seller_whatsapp text,                               -- só dígitos, ex.: 63992132267
  delivery_info   text,                               -- ex.: seg a sáb, até 11h
  notes           text,                               -- observações internas
  city            text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------- Clientes (restaurantes, bares...) ----------
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null unique references public.profiles (id) on delete cascade,
  name          text not null,
  business_type text,            -- restaurante, bar, lanchonete...
  cnpj          text,
  phone         text,
  city          text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- Produtos canônicos (unificação feita pelo admin) ----------
create table public.canonical_products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  unit       text not null,
  category   text,
  created_at timestamptz not null default now(),
  unique (name, unit)
);

-- ---------- Produtos do fornecedor ----------
create or replace function public.normalize_text(txt text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(public.unaccent(coalesce(txt, '')))), '\s+', ' ', 'g');
$$;

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  supplier_id     uuid not null references public.suppliers (id) on delete cascade,
  name            text not null,
  unit            text not null,                 -- kg, un, cx, l...
  category        text,
  normalized_name text generated always as (public.normalize_text(name)) stored,
  canonical_id    uuid references public.canonical_products (id) on delete set null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (supplier_id, normalized_name, unit)
);

create index products_supplier_idx on public.products (supplier_id);
create index products_normalized_idx on public.products (normalized_name);
create index products_canonical_idx on public.products (canonical_id);

-- ---------- Cotações diárias ----------
create table public.price_quotes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  price       numeric(12, 2) not null check (price >= 0),
  quote_date  date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at  timestamptz not null default now(),
  unique (product_id, quote_date)
);

create index price_quotes_product_date_idx on public.price_quotes (product_id, quote_date desc);
create index price_quotes_supplier_date_idx on public.price_quotes (supplier_id, quote_date desc);

-- ---------- Views ----------
-- Último preço informado de cada produto
create or replace view public.latest_prices
with (security_invoker = true) as
select distinct on (q.product_id)
  q.product_id,
  q.supplier_id,
  q.price,
  q.quote_date
from public.price_quotes q
order by q.product_id, q.quote_date desc, q.created_at desc;

-- Ranking: um registro por produto/fornecedor, com chave de agrupamento
-- (canônico se o admin unificou; senão nome normalizado + unidade)
create or replace view public.product_ranking
with (security_invoker = true) as
select
  p.id                                                   as product_id,
  coalesce(p.canonical_id::text, p.normalized_name || '|' || p.unit) as group_key,
  coalesce(cp.name, p.name)                              as product_name,
  coalesce(cp.unit, p.unit)                              as unit,
  coalesce(cp.category, p.category)                      as category,
  s.id                                                   as supplier_id,
  s.name                                                 as supplier_name,
  s.city                                                 as supplier_city,
  lp.price,
  lp.quote_date,
  rank() over (
    partition by coalesce(p.canonical_id::text, p.normalized_name || '|' || p.unit)
    order by lp.price asc, lp.quote_date desc
  )                                                      as position
from public.products p
join public.suppliers s      on s.id = p.supplier_id and s.is_active
join public.latest_prices lp on lp.product_id = p.id
left join public.canonical_products cp on cp.id = p.canonical_id
where p.is_active;

-- ---------- RLS ----------
alter table public.profiles           enable row level security;
alter table public.suppliers          enable row level security;
alter table public.customers          enable row level security;
alter table public.canonical_products enable row level security;
alter table public.products           enable row level security;
alter table public.price_quotes       enable row level security;

-- profiles
create policy "profiles: próprio ou admin lê"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles: próprio atualiza"
  on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles: admin gerencia"
  on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- suppliers
create policy "suppliers: autenticados leem ativos"
  on public.suppliers for select
  using (auth.uid() is not null and (is_active or profile_id = auth.uid() or public.is_admin()));
create policy "suppliers: dono atualiza"
  on public.suppliers for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "suppliers: admin gerencia"
  on public.suppliers for all
  using (public.is_admin()) with check (public.is_admin());

-- customers
create policy "customers: próprio ou admin lê"
  on public.customers for select
  using (profile_id = auth.uid() or public.is_admin());
create policy "customers: dono atualiza"
  on public.customers for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "customers: admin gerencia"
  on public.customers for all
  using (public.is_admin()) with check (public.is_admin());

-- canonical_products
create policy "canonical: autenticados leem"
  on public.canonical_products for select
  using (auth.uid() is not null);
create policy "canonical: admin gerencia"
  on public.canonical_products for all
  using (public.is_admin()) with check (public.is_admin());

-- products
create policy "products: autenticados leem"
  on public.products for select
  using (auth.uid() is not null);
create policy "products: fornecedor gerencia os seus"
  on public.products for all
  using (supplier_id in (select id from public.suppliers where profile_id = auth.uid()))
  with check (supplier_id in (select id from public.suppliers where profile_id = auth.uid()));
create policy "products: admin gerencia"
  on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- price_quotes
create policy "quotes: autenticados leem"
  on public.price_quotes for select
  using (auth.uid() is not null);
create policy "quotes: fornecedor gerencia as suas"
  on public.price_quotes for all
  using (supplier_id in (select id from public.suppliers where profile_id = auth.uid()))
  with check (supplier_id in (select id from public.suppliers where profile_id = auth.uid()));
create policy "quotes: admin gerencia"
  on public.price_quotes for all
  using (public.is_admin()) with check (public.is_admin());
