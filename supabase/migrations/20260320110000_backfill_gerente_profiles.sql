-- Backfill de gerentes antigos sem profile/company_id válido.
-- Estratégia:
-- 1) localizar usuários auth com role=gerente (metadata user/app)
-- 2) reaproveitar company por login_code quando existir
-- 3) criar company quando necessário
-- 4) criar/atualizar profile idempotentemente

begin;

create extension if not exists pgcrypto;

create or replace function public.backfill_gerente_profiles()
returns table (
  user_id uuid,
  company_id uuid,
  action text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  usr record;
  v_company_id uuid;
  v_login_code text;
  v_razao_social text;
  v_profile_nome text;
  v_cnpj text;
  v_had_profile boolean;
begin
  for usr in
    select
      u.id as auth_user_id,
      coalesce(u.raw_user_meta_data, '{}'::jsonb) as meta_user,
      coalesce(u.raw_app_meta_data, '{}'::jsonb) as meta_app
    from auth.users u
    where coalesce(
      nullif(btrim(coalesce(u.raw_user_meta_data, '{}'::jsonb) ->> 'role'), ''),
      nullif(btrim(coalesce(u.raw_app_meta_data, '{}'::jsonb) ->> 'role'), '')
    ) = 'gerente'
  loop
    select p.company_id is not null
      into v_had_profile
    from public.profiles p
    where p.user_id = usr.auth_user_id
    limit 1;

    v_razao_social := coalesce(
      nullif(btrim(usr.meta_user ->> 'razao_social'), ''),
      nullif(btrim(usr.meta_app ->> 'razao_social'), ''),
      nullif(btrim(usr.meta_user ->> 'nome'), ''),
      nullif(btrim(usr.meta_app ->> 'nome'), '')
    );

    v_profile_nome := coalesce(
      nullif(btrim(usr.meta_user ->> 'nome'), ''),
      nullif(btrim(usr.meta_app ->> 'nome'), ''),
      v_razao_social
    );

    if v_razao_social is null or v_profile_nome is null then
      continue;
    end if;

    v_cnpj := coalesce(
      nullif(btrim(usr.meta_user ->> 'cnpj'), ''),
      nullif(btrim(usr.meta_app ->> 'cnpj'), '')
    );

    v_login_code := coalesce(
      nullif(btrim(usr.meta_user ->> 'login_code'), ''),
      nullif(btrim(usr.meta_app ->> 'login_code'), ''),
      upper(substring(encode(digest(usr.auth_user_id::text, 'sha256'), 'hex') from 1 for 10))
    );

    select p.company_id
      into v_company_id
    from public.profiles p
    where p.user_id = usr.auth_user_id
    limit 1;

    if v_company_id is null then
      select c.id
        into v_company_id
      from public.companies c
      where c.login_code = v_login_code
      limit 1;
    end if;

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
    values (usr.auth_user_id, v_company_id, 'gerente', v_profile_nome, now())
    on conflict (user_id) do update
    set
      company_id = excluded.company_id,
      role = excluded.role,
      nome = excluded.nome;

    user_id := usr.auth_user_id;
    company_id := v_company_id;
    if coalesce(v_had_profile, false) then
      action := 'updated_profile';
    else
      action := 'created_profile';
    end if;
    return next;
  end loop;
end;
$$;

comment on function public.backfill_gerente_profiles()
is 'Reprocessa onboarding de gerentes antigos sem profile/company. Idempotente.';

-- Executa uma vez na migração para corrigir dados legados.
select * from public.backfill_gerente_profiles();

commit;
