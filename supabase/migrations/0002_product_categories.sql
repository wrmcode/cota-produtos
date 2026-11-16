-- ============================================================
-- 0002 — Categorias de produto controladas pelo admin
-- Substitui o texto livre `products.category` por FK para `product_categories`,
-- evitando redundância ("carne" x "carnes"). Rode após 0001.
-- ============================================================

create table public.product_categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  normalized_name text generated always as (public.normalize_text(name)) stored,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (normalized_name)
);

alter table public.products
  add column category_id uuid references public.product_categories (id) on delete set null;
alter table public.canonical_products
  add column category_id uuid references public.product_categories (id) on delete set null;

create index products_category_idx on public.products (category_id);

-- Categorias iniciais (o admin pode renomear/remover)
insert into public.product_categories (name, sort_order) values
  ('Carnes', 10),
  ('Aves', 20),
  ('Peixes e frutos do mar', 30),
  ('Frios e embutidos', 40),
  ('Laticínios', 50),
  ('Hortifruti', 60),
  ('Mercearia', 70),
  ('Grãos e cereais', 80),
  ('Bebidas', 90),
  ('Padaria', 100),
  ('Congelados', 110),
  ('Temperos e condimentos', 120),
  ('Limpeza', 130),
  ('Descartáveis e embalagens', 140)
on conflict do nothing;

-- Migra o texto livre que já existir para a FK (cria a categoria se faltar)
insert into public.product_categories (name)
select distinct initcap(trim(category))
from public.products
where category is not null and trim(category) <> ''
on conflict do nothing;

update public.products p
set category_id = c.id
from public.product_categories c
where p.category is not null and c.normalized_name = public.normalize_text(p.category);

update public.canonical_products cp
set category_id = c.id
from public.product_categories c
where cp.category is not null and c.normalized_name = public.normalize_text(cp.category);

-- A view depende das colunas antigas: recria antes de removê-las
drop view if exists public.product_ranking;

alter table public.products drop column category;
alter table public.canonical_products drop column category;

create view public.product_ranking
with (security_invoker = true) as
select
  p.id                                                   as product_id,
  coalesce(p.canonical_id::text, p.normalized_name || '|' || p.unit) as group_key,
  coalesce(cp.name, p.name)                              as product_name,
  coalesce(cp.unit, p.unit)                              as unit,
  coalesce(ccat.name, pcat.name)                         as category,
  coalesce(cp.category_id, p.category_id)                as category_id,
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
left join public.canonical_products cp   on cp.id = p.canonical_id
left join public.product_categories pcat on pcat.id = p.category_id
left join public.product_categories ccat on ccat.id = cp.category_id
where p.is_active;

-- RLS: todo autenticado lê; só admin gerencia
alter table public.product_categories enable row level security;

create policy "categories: autenticados leem"
  on public.product_categories for select
  using (auth.uid() is not null);
create policy "categories: admin gerencia"
  on public.product_categories for all
  using (public.is_admin()) with check (public.is_admin());
