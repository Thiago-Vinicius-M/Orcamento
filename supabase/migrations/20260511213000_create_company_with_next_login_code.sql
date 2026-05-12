-- Aloca login_code sequencial para empresas, protegendo cadastros simultaneos.
-- O proximo codigo vem do maior login_code numerico existente; se todas as
-- empresas forem removidas, a contagem volta naturalmente para 1.

begin;

create or replace function public.create_company_with_next_login_code(
  _razao_social text,
  _cnpj text default null
)
returns table (
  company_id uuid,
  login_code text
)
language plpgsql
set search_path = public
as $$
declare
  v_razao_social text := nullif(btrim(_razao_social), '');
  v_cnpj text := nullif(btrim(_cnpj), '');
  v_company_id uuid;
  v_login_code text;
begin
  if v_razao_social is null then
    raise exception 'razao_social is required'
      using errcode = '23502';
  end if;

  -- Serializa a leitura do maior codigo e o insert subsequente nesta transacao.
  perform pg_advisory_xact_lock(20260511, 213000);

  select (coalesce(max(c.login_code::bigint), 0) + 1)::text
    into v_login_code
  from public.companies c
  where c.login_code ~ '^[0-9]+$';

  insert into public.companies (razao_social, cnpj, login_code, created_at)
  values (v_razao_social, v_cnpj, v_login_code, now())
  returning id into v_company_id;

  return query
  select v_company_id, v_login_code;
end;
$$;

comment on function public.create_company_with_next_login_code(text, text)
is 'Cria uma empresa com login_code numerico sequencial, usando advisory lock para evitar duplicidade em cadastros simultaneos.';

revoke all on function public.create_company_with_next_login_code(text, text) from public;
revoke all on function public.create_company_with_next_login_code(text, text) from anon, authenticated;
grant execute on function public.create_company_with_next_login_code(text, text) to service_role;

commit;
