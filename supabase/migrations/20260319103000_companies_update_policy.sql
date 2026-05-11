-- RLS: allow only gerente to update companies' public identity fields
-- Specifically: gerente can update `razao_social` and `cnpj` of their own company.

-- Helper: verify that immutable fields are not changed during UPDATE.
-- RLS policies are row-based, so we validate "column-level" immutability via comparison
-- between the original row (current table contents under the update statement) and the
-- proposed new values (passed as parameters).
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

alter table public.companies enable row level security;

drop policy if exists "companies_gerente_update_own" on public.companies;

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

