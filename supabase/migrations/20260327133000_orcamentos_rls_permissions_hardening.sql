-- Hardening de RLS e permissões para orcamentos e funções associadas.
-- Objetivo: garantir isolamento por company_id e minimizar grants excessivos.

begin;

-- Mantém RLS ativo para a tabela principal.
alter table public.orcamentos enable row level security;

-- Permissões explícitas da tabela:
-- - público/anon sem acesso direto
-- - authenticated com CRUD sujeito a RLS
revoke all on table public.orcamentos from public;
revoke all on table public.orcamentos from anon;
grant select, insert, update, delete on table public.orcamentos to authenticated;

-- Remove variações legadas de policies para evitar sobreposição.
drop policy if exists "orcamentos_select_same_company_by_role" on public.orcamentos;
drop policy if exists "orcamentos_select_authenticated" on public.orcamentos;
drop policy if exists "orcamentos_insert_vendedor_or_gerente" on public.orcamentos;
drop policy if exists "orcamentos_insert_authenticated" on public.orcamentos;
drop policy if exists "orcamentos_update_owner_or_gerente" on public.orcamentos;
drop policy if exists "orcamentos_update_authenticated" on public.orcamentos;
drop policy if exists "orcamentos_delete_owner_or_gerente" on public.orcamentos;
drop policy if exists "orcamentos_delete_authenticated" on public.orcamentos;
drop policy if exists "orcamentos_delete_gerente_only" on public.orcamentos;

-- Policy de leitura: gerente vê todos da empresa, vendedor vê os próprios.
create policy "orcamentos_select_by_company_and_role"
  on public.orcamentos
  for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      public.current_role() = 'gerente'
      or vendedor_id = auth.uid()
    )
  );

-- Policy de insert: vendedor só cria próprios registros; gerente cria qualquer da empresa.
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
  );

-- Policy de update: gerente atualiza tudo na empresa, vendedor só os próprios.
create policy "orcamentos_update_by_company_and_role"
  on public.orcamentos
  for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      public.current_role() = 'gerente'
      or vendedor_id = auth.uid()
    )
  )
  with check (
    company_id = public.current_company_id()
    and (
      (public.current_role() = 'vendedor' and vendedor_id = auth.uid())
      or public.current_role() = 'gerente'
    )
  );

-- Policy de delete: somente gerente da própria empresa pode excluir.
create policy "orcamentos_delete_gerente_only"
  on public.orcamentos
  for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_role() = 'gerente'
  );

-- Endurecimento das funções usadas na numeração/trigger.
revoke all on function public.next_orcamento_numero_pdf() from public;
revoke all on function public.next_orcamento_numero_pdf() from anon;
grant execute on function public.next_orcamento_numero_pdf() to authenticated;

revoke all on function public.next_orcamento_numero_pdf_for_company(uuid) from public;
revoke all on function public.next_orcamento_numero_pdf_for_company(uuid) from anon;
revoke all on function public.next_orcamento_numero_pdf_for_company(uuid) from authenticated;

revoke all on function public.orcamentos_set_numero_pdf_before_insert() from public;
revoke all on function public.orcamentos_set_numero_pdf_before_insert() from anon;
revoke all on function public.orcamentos_set_numero_pdf_before_insert() from authenticated;

commit;
