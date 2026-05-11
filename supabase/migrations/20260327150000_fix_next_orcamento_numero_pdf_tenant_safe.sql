-- Corrige regressão introduzida em 20260327140000_fix_next_orcamento_numero_pdf_rpc.sql:
-- aquela migração substituiu next_orcamento_numero_pdf() por uma versão que lia
-- orcamentos globalmente (sem company_id) e concedeu EXECUTE a anon.
-- Restaura delegação tenant-safe a next_orcamento_numero_pdf_for_company(current_company_id()),
-- valida company_id da sessão e alinha grants com 20260327133000_orcamentos_rls_permissions_hardening.sql.

begin;

create or replace function public.next_orcamento_numero_pdf()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
begin
  if v_company_id is null then
    return null;
  end if;

  return public.next_orcamento_numero_pdf_for_company(v_company_id);
end;
$$;

comment on function public.next_orcamento_numero_pdf()
is 'Gera o próximo identificador curto (0000-X) por empresa para persistir em orcamentos.numero_pdf.';

revoke all on function public.next_orcamento_numero_pdf() from public;
revoke all on function public.next_orcamento_numero_pdf() from anon;
revoke all on function public.next_orcamento_numero_pdf() from service_role;
grant execute on function public.next_orcamento_numero_pdf() to authenticated;

-- Garante que nenhum grant indevido a anon permaneça nas funções correlatas (estado esperado pós-27133000).
revoke all on function public.next_orcamento_numero_pdf_for_company(uuid) from public;
revoke all on function public.next_orcamento_numero_pdf_for_company(uuid) from anon;
revoke all on function public.next_orcamento_numero_pdf_for_company(uuid) from authenticated;

revoke all on function public.orcamentos_set_numero_pdf_before_insert() from public;
revoke all on function public.orcamentos_set_numero_pdf_before_insert() from anon;
revoke all on function public.orcamentos_set_numero_pdf_before_insert() from authenticated;

commit;
