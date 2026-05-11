-- Supabase initial schema for NewOrca budgeting system
-- Tables: companies, profiles, vendedor_credentials, clientes, produtos, orcamentos, orcamento_itens, orcamento_pagamento
-- Includes RLS policies according to multi-tenant and role rules.

-----------------------------
-- Helper types and enums  --
-----------------------------

create type public.role_type as enum ('gerente', 'vendedor');

create type public.status_type as enum ('rascunho', 'vigente', 'expirado', 'aprovado', 'cancelado');

create type public.pagamento_tipo as enum ('dinheiro', 'debito', 'credito', 'pix', 'boleto', 'financiamento');

-----------------------------
-- Core tables             --
-----------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  cnpj text,
  login_code text not null unique,
  email_contato text,
  telefone_contato text,
  endereco text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  role public.role_type not null,
  nome text not null,
  created_at timestamptz not null default now()
);

create table public.vendedor_credentials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  username text not null,
  auth_email text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (company_id, username)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  nome text not null,
  documento text,
  email text,
  telefone text,
  endereco text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  nome text not null,
  descricao text,
  preco_unitario numeric(12,2) not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vendedor_id uuid not null references auth.users (id),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  status public.status_type not null default 'rascunho',
  validade_ate date not null default (now() + interval '30 days')::date,
  subtotal numeric(14,2) not null default 0,
  desconto_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade numeric(12,2) not null check (quantidade > 0),
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0)
);

create table public.orcamento_pagamento (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null unique references public.orcamentos (id) on delete cascade,
  tipo public.pagamento_tipo not null,
  valor_entrada numeric(14,2),
  num_parcelas integer,
  taxa_servico_percentual numeric(6,3),
  aplicar_taxa boolean not null default false,
  created_at timestamptz not null default now()
);

--------------------------------
-- Helper functions for RLS   --
--------------------------------

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.profiles
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_role()
returns public.role_type
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
  limit 1;
$$;

--------------------------------
-- Row Level Security (RLS)   --
--------------------------------

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.vendedor_credentials enable row level security;
alter table public.clientes enable row level security;
alter table public.produtos enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.orcamento_pagamento enable row level security;

-- companies: each user only sees its own company
create policy "companies_select_own"
  on public.companies
  for select
  using (id = public.current_company_id());

-- profiles: same company only
create policy "profiles_same_company_select"
  on public.profiles
  for select
  using (company_id = public.current_company_id());

-- vendedor_credentials: same company, only gerente can see
create policy "vendedor_credentials_same_company_gerente_select"
  on public.vendedor_credentials
  for select
  using (
    company_id = public.current_company_id()
    and public.current_role() = 'gerente'
  );

create policy "vendedor_credentials_same_company_gerente_all"
  on public.vendedor_credentials
  for all
  using (
    company_id = public.current_company_id()
    and public.current_role() = 'gerente'
  )
  with check (
    company_id = public.current_company_id()
    and public.current_role() = 'gerente'
  );

-- clientes: all users from same company can CRUD
create policy "clientes_same_company_select"
  on public.clientes
  for select
  using (company_id = public.current_company_id());

create policy "clientes_same_company_insert"
  on public.clientes
  for insert
  with check (company_id = public.current_company_id());

create policy "clientes_same_company_update"
  on public.clientes
  for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- produtos: select for both roles, write only gerente
create policy "produtos_same_company_select"
  on public.produtos
  for select
  using (company_id = public.current_company_id());

create policy "produtos_gerente_only_write"
  on public.produtos
  for all
  using (
    company_id = public.current_company_id()
    and public.current_role() = 'gerente'
  )
  with check (
    company_id = public.current_company_id()
    and public.current_role() = 'gerente'
  );

-- orcamentos: vendedor only their own, gerente all in company
create policy "orcamentos_select_same_company_by_role"
  on public.orcamentos
  for select
  using (
    company_id = public.current_company_id()
    and (
      public.current_role() = 'gerente'
      or vendedor_id = auth.uid()
    )
  );

create policy "orcamentos_insert_vendedor_or_gerente"
  on public.orcamentos
  for insert
  with check (
    company_id = public.current_company_id()
    and (
      (public.current_role() = 'vendedor' and vendedor_id = auth.uid())
      or public.current_role() = 'gerente'
    )
  );

create policy "orcamentos_update_owner_or_gerente"
  on public.orcamentos
  for update
  using (
    company_id = public.current_company_id()
    and (
      (public.current_role() = 'vendedor' and vendedor_id = auth.uid())
      or public.current_role() = 'gerente'
    )
  )
  with check (
    company_id = public.current_company_id()
    and (
      (public.current_role() = 'vendedor' and vendedor_id = auth.uid())
      or public.current_role() = 'gerente'
    )
  );

-- orcamento_itens: follow parent orcamento visibility
create policy "orcamento_itens_same_company_by_parent"
  on public.orcamento_itens
  for select
  using (
    exists (
      select 1
      from public.orcamentos o
      where o.id = orcamento_itens.orcamento_id
        and o.company_id = public.current_company_id()
        and (
          public.current_role() = 'gerente'
          or o.vendedor_id = auth.uid()
        )
    )
  );

create policy "orcamento_itens_write_by_parent"
  on public.orcamento_itens
  for all
  using (
    exists (
      select 1
      from public.orcamentos o
      where o.id = orcamento_itens.orcamento_id
        and o.company_id = public.current_company_id()
        and (
          (public.current_role() = 'vendedor' and o.vendedor_id = auth.uid())
          or public.current_role() = 'gerente'
        )
    )
  )
  with check (
    exists (
      select 1
      from public.orcamentos o
      where o.id = orcamento_itens.orcamento_id
        and o.company_id = public.current_company_id()
        and (
          (public.current_role() = 'vendedor' and o.vendedor_id = auth.uid())
          or public.current_role() = 'gerente'
        )
    )
  );

-- orcamento_pagamento: follow parent orcamento visibility
create policy "orcamento_pagamento_same_company_by_parent"
  on public.orcamento_pagamento
  for select
  using (
    exists (
      select 1
      from public.orcamentos o
      where o.id = orcamento_pagamento.orcamento_id
        and o.company_id = public.current_company_id()
        and (
          public.current_role() = 'gerente'
          or o.vendedor_id = auth.uid()
        )
    )
  );

create policy "orcamento_pagamento_write_by_parent"
  on public.orcamento_pagamento
  for all
  using (
    exists (
      select 1
      from public.orcamentos o
      where o.id = orcamento_pagamento.orcamento_id
        and o.company_id = public.current_company_id()
        and (
          (public.current_role() = 'vendedor' and o.vendedor_id = auth.uid())
          or public.current_role() = 'gerente'
        )
    )
  )
  with check (
    exists (
      select 1
      from public.orcamentos o
      where o.id = orcamento_pagamento.orcamento_id
        and o.company_id = public.current_company_id()
        and (
          (public.current_role() = 'vendedor' and o.vendedor_id = auth.uid())
          or public.current_role() = 'gerente'
        )
    )
  );

-- profiles write access (usually via backend/service role; allow same company gerente to update basic data)
create policy "profiles_same_company_gerente_update"
  on public.profiles
  for update
  using (
    company_id = public.current_company_id()
    and public.current_role() = 'gerente'
  )
  with check (
    company_id = public.current_company_id()
  );

-- Optional: allow user to see own profile even if company_id is null (during onboarding)
create policy "profiles_see_own"
  on public.profiles
  for select
  using (user_id = auth.uid());

