-- Rastreabilidade: quem gerou o orçamento (created_by_user_id + snapshot created_by_name).
-- Trigger BEFORE INSERT preenche a partir de auth.uid() e profiles; BEFORE UPDATE preserva imutabilidade.
-- RLS no INSERT reforça que created_by_user_id coincide com auth.uid() após o trigger.

begin;

-- 1) Colunas + FK opcional para auth.users
alter table public.orcamentos
  add column if not exists created_by_user_id uuid references auth.users (id),
  add column if not exists created_by_name text;

comment on column public.orcamentos.created_by_user_id is 'Usuário que gerou o documento (preenchido no INSERT; imutável).';
comment on column public.orcamentos.created_by_name is 'Nome do perfil na empresa no momento da criação (snapshot; imutável).';

-- 2) Índice parcial para filtros do gerente por autor
create index if not exists orcamentos_company_created_by_user_id_idx
  on public.orcamentos (company_id, created_by_user_id)
  where created_by_user_id is not null;

-- 3) Backfill a partir de vendedor_id + profiles na mesma empresa
update public.orcamentos o
set
  created_by_user_id = o.vendedor_id,
  created_by_name = p.nome
from public.profiles p
where o.created_by_user_id is null
  and p.user_id = o.vendedor_id
  and p.company_id = o.company_id;

-- 4) BEFORE INSERT: fonte confiável (sobrescreve valores enviados pelo cliente)
create or replace function public.orcamentos_set_created_by_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_by_user_id := auth.uid();

  select p.nome
  into new.created_by_name
  from public.profiles p
  where p.user_id = auth.uid()
    and p.company_id = new.company_id
  limit 1;

  return new;
end;
$$;

comment on function public.orcamentos_set_created_by_before_insert()
is 'Define created_by_user_id e created_by_name no INSERT a partir de auth.uid() e profiles da mesma company_id.';

drop trigger if exists trg_orcamentos_a_created_by_before_insert on public.orcamentos;

-- Nome alfabético antes de trg_orcamentos_set_numero_pdf_before_insert para ordem estável na fase BEFORE INSERT.
create trigger trg_orcamentos_a_created_by_before_insert
before insert on public.orcamentos
for each row
execute function public.orcamentos_set_created_by_before_insert();

-- 5) BEFORE UPDATE: imutabilidade dos campos de auditoria
create or replace function public.orcamentos_preserve_created_by_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_by_user_id := old.created_by_user_id;
  new.created_by_name := old.created_by_name;
  return new;
end;
$$;

comment on function public.orcamentos_preserve_created_by_before_update()
is 'Impede alteração de created_by_user_id e created_by_name após a criação.';

drop trigger if exists trg_orcamentos_preserve_created_by_before_update on public.orcamentos;

create trigger trg_orcamentos_preserve_created_by_before_update
before update on public.orcamentos
for each row
execute function public.orcamentos_preserve_created_by_before_update();

-- 6) RLS: WITH CHECK mínimo no INSERT (avaliação após triggers BEFORE ROW)
drop policy if exists "orcamentos_insert_by_company_and_role" on public.orcamentos;

create policy "orcamentos_insert_by_company_and_role"
  on public.orcamentos
  for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and (
      (public.current_role() = 'vendedor' and vendedor_id = auth.uid())
      or public.current_role() = 'gerente'
    )
    and created_by_user_id is not distinct from auth.uid()
  );

-- 7) Hardening EXECUTE (mesmo padrão de orcamentos_set_numero_pdf_before_insert)
revoke all on function public.orcamentos_set_created_by_before_insert() from public;
revoke all on function public.orcamentos_set_created_by_before_insert() from anon;
revoke all on function public.orcamentos_set_created_by_before_insert() from authenticated;

revoke all on function public.orcamentos_preserve_created_by_before_update() from public;
revoke all on function public.orcamentos_preserve_created_by_before_update() from anon;
revoke all on function public.orcamentos_preserve_created_by_before_update() from authenticated;

commit;
