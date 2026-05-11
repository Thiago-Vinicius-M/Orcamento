-- RPC para o app reparar perfil/empresa quando o trigger não rodou ou migração não foi aplicada.
-- Chamada segura: só cria company/profile para o usuário logado com metadata de gerente.

begin;

create or replace function public.ensure_gerente_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  meta_user jsonb;
  meta_app jsonb;
  auth_role text;
  v_razao_social text;
  v_profile_nome text;
  v_cnpj text;
  v_login_code text;
  v_company_id uuid;
  existing_company_id uuid;
begin
  if uid is null then
    return null;
  end if;

  select p.company_id
    into existing_company_id
  from public.profiles p
  where p.user_id = uid
  limit 1;

  if existing_company_id is not null then
    return existing_company_id;
  end if;

  select
    coalesce(u.raw_user_meta_data, '{}'::jsonb),
    coalesce(u.raw_app_meta_data, '{}'::jsonb)
  into meta_user, meta_app
  from auth.users u
  where u.id = uid;

  auth_role := coalesce(
    nullif(btrim(meta_user ->> 'role'), ''),
    nullif(btrim(meta_app ->> 'role'), '')
  );

  if auth_role = 'vendedor' then
    return null;
  end if;

  v_razao_social := coalesce(
    nullif(btrim(meta_user ->> 'razao_social'), ''),
    nullif(btrim(meta_app ->> 'razao_social'), '')
  );

  v_profile_nome := coalesce(
    nullif(btrim(meta_user ->> 'nome'), ''),
    nullif(btrim(meta_app ->> 'nome'), '')
  );

  if v_razao_social is null then
    v_razao_social := v_profile_nome;
  end if;
  if v_profile_nome is null then
    v_profile_nome := v_razao_social;
  end if;

  if v_razao_social is null or v_profile_nome is null then
    return null;
  end if;

  v_cnpj := coalesce(
    nullif(btrim(meta_user ->> 'cnpj'), ''),
    nullif(btrim(meta_app ->> 'cnpj'), '')
  );

  v_login_code := coalesce(
    nullif(btrim(meta_user ->> 'login_code'), ''),
    nullif(btrim(meta_app ->> 'login_code'), ''),
    upper(substring(encode(digest(uid::text, 'sha256'), 'hex') from 1 for 10))
  );

  select c.id
    into v_company_id
  from public.companies c
  where c.login_code = v_login_code
  limit 1;

  if v_company_id is null then
    insert into public.companies (razao_social, cnpj, login_code, created_at)
    values (v_razao_social, v_cnpj, v_login_code, now())
    on conflict (login_code) do update
      set
        razao_social = excluded.razao_social,
        cnpj = coalesce(excluded.cnpj, public.companies.cnpj)
    returning id into v_company_id;
  end if;

  insert into public.profiles (user_id, company_id, role, nome, created_at)
  values (uid, v_company_id, 'gerente', v_profile_nome, now())
  on conflict (user_id) do update
  set
    company_id = excluded.company_id,
    role = excluded.role,
    nome = excluded.nome;

  return v_company_id;
end;
$$;

comment on function public.ensure_gerente_profile()
is 'Garante public.profiles + company para gerente logado quando o onboarding por trigger não ocorreu.';

revoke all on function public.ensure_gerente_profile() from public;
grant execute on function public.ensure_gerente_profile() to authenticated;

commit;
