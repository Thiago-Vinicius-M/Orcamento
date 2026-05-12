-- Reset de public.companies: substitui o login_code text + advisory-lock + MAX(...)+1
-- por uma coluna sequencial atomica via GENERATED ALWAYS AS IDENTITY, mantendo o
-- tipo "text" da coluna publica login_code (compatibilidade total com login-vendedor,
-- frontend e template de e-mail).
--
-- A trigger de onboarding e a RPC de reparo passam a confiar APENAS em
-- raw_app_meta_data.company_id (escrito exclusivamente pelo service_role na edge
-- function register-gerente). Isso elimina o vetor de cross-tenant attach via
-- raw_user_meta_data e remove a auto-criacao de companies a partir de metadata.
--
-- Aplicar em banco zerado (db reset + auth users apagados). O CASCADE em
-- drop table public.companies derruba FKs filhas (profiles, vendedor_credentials,
-- clientes, produtos, orcamentos, orcamento_numeracao) e a funcao SQL
-- companies_gerente_update_allows_only_razao_social_cnpj — todas recriadas abaixo.

begin;

-- 1) Remove trigger e funcoes da versao anterior antes de mexer na tabela.
drop trigger if exists on_auth_user_created_gerente on auth.users;
drop function if exists public.handle_gerente_onboarding() cascade;
drop function if exists public.ensure_gerente_profile() cascade;
drop function if exists public.create_company_with_next_login_code(text, text) cascade;
drop function if exists public.backfill_gerente_profiles() cascade;

-- 2) Recria companies com identity (sequence-level lock nativo, sem race) +
--    login_code text gerado como projecao da sequence. Qualquer INSERT/UPDATE
--    direto em login_code falha com 428C9 (defesa em profundidade).
drop table if exists public.companies cascade;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  login_code_seq bigint generated always as identity (start with 1 increment by 1),
  login_code text generated always as (login_code_seq::text) stored,
  razao_social text not null,
  cnpj text,
  email_contato text,
  telefone_contato text,
  endereco text,
  created_at timestamptz not null default now(),
  constraint companies_login_code_uk unique (login_code),
  constraint companies_login_code_seq_uk unique (login_code_seq)
);

create index companies_login_code_idx on public.companies (login_code);

alter table public.companies enable row level security;

-- 3) Restaura as FKs filhas que o cascade derrubou. Os nomes seguem a convencao
--    do init_schema (e demais migrations) para que o estado final seja indistinguivel.
alter table public.profiles
  add constraint profiles_company_id_fkey
  foreign key (company_id) references public.companies (id) on delete cascade;

alter table public.vendedor_credentials
  add constraint vendedor_credentials_company_id_fkey
  foreign key (company_id) references public.companies (id) on delete cascade;

alter table public.clientes
  add constraint clientes_company_id_fkey
  foreign key (company_id) references public.companies (id) on delete cascade;

alter table public.produtos
  add constraint produtos_company_id_fkey
  foreign key (company_id) references public.companies (id) on delete cascade;

alter table public.orcamentos
  add constraint orcamentos_company_id_fkey
  foreign key (company_id) references public.companies (id) on delete cascade;

alter table public.orcamento_numeracao
  add constraint orcamento_numeracao_company_id_fkey
  foreign key (company_id) references public.companies (id) on delete cascade;

-- 4) Recria a funcao SQL (drop cascade pegou ela) que valida imutabilidade dos
--    campos restantes em UPDATE de gerente. Continua aceitando login_code como
--    parametro porque a policy precisa compara-lo (a coluna agora e generated
--    stored, entao na pratica nunca muda — defesa em profundidade extra).
create or replace function public.companies_gerente_update_allows_only_razao_social_cnpj(
  _id uuid,
  _login_code text,
  _email_contato text,
  _telefone_contato text,
  _endereco text,
  _created_at timestamptz
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = _id
      and c.login_code is not distinct from _login_code
      and c.email_contato is not distinct from _email_contato
      and c.telefone_contato is not distinct from _telefone_contato
      and c.endereco is not distinct from _endereco
      and c.created_at = _created_at
  );
$$;

-- 5) Reaplica policies de companies (init_schema + companies_update_policy).
create policy "companies_select_own"
  on public.companies
  for select
  using (id = public.current_company_id());

create policy "companies_gerente_update_own"
  on public.companies
  for update
  using (
    id = public.current_company_id()
    and public.current_role() = 'gerente'
  )
  with check (
    id = public.current_company_id()
    and public.current_role() = 'gerente'
    and public.companies_gerente_update_allows_only_razao_social_cnpj(
      id,
      login_code,
      email_contato,
      telefone_contato,
      endereco,
      created_at
    )
  );

-- 6) RPC trivial: INSERT ... RETURNING. A sequence (identity) serializa em
--    SequenceShareLock automaticamente — sem advisory_xact_lock, MAX(...) ou regex.
create or replace function public.create_company_with_next_login_code(
  _razao_social text,
  _cnpj text default null
)
returns table (company_id uuid, login_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_razao_social text := nullif(btrim(_razao_social), '');
  v_cnpj text := nullif(btrim(_cnpj), '');
  v_id uuid;
  v_code text;
begin
  if v_razao_social is null then
    raise exception 'razao_social is required'
      using errcode = '23502';
  end if;

  insert into public.companies as c (razao_social, cnpj)
  values (v_razao_social, v_cnpj)
  returning c.id, c.login_code into v_id, v_code;

  return query select v_id, v_code;
end;
$$;

comment on function public.create_company_with_next_login_code(text, text)
is 'Cria uma empresa e retorna o login_code sequencial alocado pela coluna IDENTITY de companies.';

revoke all on function public.create_company_with_next_login_code(text, text) from public;
revoke all on function public.create_company_with_next_login_code(text, text) from anon, authenticated;
grant execute on function public.create_company_with_next_login_code(text, text) to service_role;

-- 7) Trigger de onboarding: confia APENAS em raw_app_meta_data.company_id (que
--    so o service_role consegue gravar via auth.admin.createUser). Sem auto-
--    criacao de company a partir de metadata — elimina cross-tenant attach.
create or replace function public.handle_gerente_onboarding()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_meta_app  jsonb := coalesce(NEW.raw_app_meta_data, '{}'::jsonb);
  v_meta_user jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := nullif(btrim(v_meta_app ->> 'role'), '');
  v_company_id_raw text := nullif(btrim(v_meta_app ->> 'company_id'), '');
  v_company_id uuid;
  v_nome text := nullif(btrim(v_meta_user ->> 'nome'), '');
begin
  if v_role is distinct from 'gerente' then
    return NEW;
  end if;

  if v_company_id_raw is null or v_nome is null then
    return NEW;
  end if;

  begin
    v_company_id := v_company_id_raw::uuid;
  exception when invalid_text_representation then
    raise warning 'handle_gerente_onboarding: company_id invalido (%): %',
      v_company_id_raw, SQLERRM;
    return NEW;
  end;

  if not exists (select 1 from public.companies where id = v_company_id) then
    raise warning 'handle_gerente_onboarding: company_id % nao existe',
      v_company_id;
    return NEW;
  end if;

  insert into public.profiles (user_id, company_id, role, nome, created_at)
  values (NEW.id, v_company_id, 'gerente', v_nome, now())
  on conflict (user_id) do update
  set
    company_id = excluded.company_id,
    role       = excluded.role,
    nome       = excluded.nome;

  return NEW;
exception when others then
  raise warning 'handle_gerente_onboarding failed for user %: % [%]',
    NEW.id, SQLERRM, SQLSTATE;
  return NEW;
end;
$$;

create trigger on_auth_user_created_gerente
  after insert on auth.users
  for each row execute procedure public.handle_gerente_onboarding();

-- 8) RPC de reparo: idempotente, baseada em raw_app_meta_data. Nao auto-cria
--    company — se nao houver company_id valido no app_metadata, devolve null
--    e a edge function (ou um humano) precisa reprocessar o cadastro.
create or replace function public.ensure_gerente_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_meta_app jsonb;
  v_meta_user jsonb;
  v_role text;
  v_company_id_raw text;
  v_company_id uuid;
  v_nome text;
  v_existing uuid;
begin
  if uid is null then
    return null;
  end if;

  select p.company_id
    into v_existing
  from public.profiles p
  where p.user_id = uid
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  select
    coalesce(u.raw_app_meta_data, '{}'::jsonb),
    coalesce(u.raw_user_meta_data, '{}'::jsonb)
  into v_meta_app, v_meta_user
  from auth.users u
  where u.id = uid;

  v_role := nullif(btrim(v_meta_app ->> 'role'), '');
  if v_role is distinct from 'gerente' then
    return null;
  end if;

  v_company_id_raw := nullif(btrim(v_meta_app ->> 'company_id'), '');
  v_nome := nullif(btrim(v_meta_user ->> 'nome'), '');

  if v_company_id_raw is null or v_nome is null then
    return null;
  end if;

  begin
    v_company_id := v_company_id_raw::uuid;
  exception when invalid_text_representation then
    return null;
  end;

  if not exists (select 1 from public.companies where id = v_company_id) then
    return null;
  end if;

  insert into public.profiles (user_id, company_id, role, nome, created_at)
  values (uid, v_company_id, 'gerente', v_nome, now())
  on conflict (user_id) do update
  set
    company_id = excluded.company_id,
    role       = excluded.role,
    nome       = excluded.nome;

  return v_company_id;
end;
$$;

comment on function public.ensure_gerente_profile()
is 'Reparo idempotente do profile do gerente logado a partir de app_metadata.company_id; nao auto-cria company.';

revoke all on function public.ensure_gerente_profile() from public;
revoke all on function public.ensure_gerente_profile() from anon;
grant execute on function public.ensure_gerente_profile() to authenticated;

commit;
