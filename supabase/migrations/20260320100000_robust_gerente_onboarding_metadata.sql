-- Robust onboarding for gerente:
-- - fallback metadata from raw_user_meta_data and raw_app_meta_data
-- - guarantee companies/profiles creation when minimum data is available
-- - keep vendedor flow untouched

begin;

create extension if not exists pgcrypto;

create or replace function public.handle_gerente_onboarding()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  meta_user jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  meta_app jsonb := coalesce(NEW.raw_app_meta_data, '{}'::jsonb);

  auth_role text := coalesce(
    nullif(btrim(meta_user ->> 'role'), ''),
    nullif(btrim(meta_app ->> 'role'), '')
  );

  razao_social text := coalesce(
    nullif(btrim(meta_user ->> 'razao_social'), ''),
    nullif(btrim(meta_app ->> 'razao_social'), '')
  );

  cnpj text := coalesce(
    nullif(btrim(meta_user ->> 'cnpj'), ''),
    nullif(btrim(meta_app ->> 'cnpj'), '')
  );

  profile_nome text := coalesce(
    nullif(btrim(meta_user ->> 'nome'), ''),
    nullif(btrim(meta_app ->> 'nome'), '')
  );

  login_code_input text := coalesce(
    nullif(btrim(meta_user ->> 'login_code'), ''),
    nullif(btrim(meta_app ->> 'login_code'), '')
  );

  login_code text;
  company_id uuid;
begin
  -- Vendedores são criados pela edge function `create-vendedor`.
  if auth_role = 'vendedor' then
    return NEW;
  end if;

  -- Só processa onboarding automático de gerente.
  if auth_role is not null and auth_role <> 'gerente' then
    return NEW;
  end if;

  -- Permite onboarding mesmo quando só um dos campos existir.
  if razao_social is null then
    razao_social := profile_nome;
  end if;
  if profile_nome is null then
    profile_nome := razao_social;
  end if;

  -- Sem dados mínimos não há como criar company/profile válidos.
  if razao_social is null or profile_nome is null then
    return NEW;
  end if;

  if login_code_input is not null then
    login_code := login_code_input;
  else
    login_code := upper(substring(encode(digest(NEW.id::text, 'sha256'), 'hex') from 1 for 10));
  end if;

  -- Reaproveita company já associada ao usuário, quando existir.
  select p.company_id
    into company_id
  from public.profiles p
  where p.user_id = NEW.id
  limit 1;

  -- Reaproveita company por login_code (idempotência/reprocessamento).
  if company_id is null then
    select c.id
      into company_id
    from public.companies c
    where c.login_code = login_code
    limit 1;
  end if;

  if company_id is null then
    insert into public.companies (razao_social, cnpj, login_code, created_at)
    values (razao_social, cnpj, login_code, now())
    on conflict (login_code) do update
      set
        razao_social = excluded.razao_social,
        cnpj = coalesce(excluded.cnpj, public.companies.cnpj)
    returning id into company_id;
  end if;

  insert into public.profiles (user_id, company_id, role, nome, created_at)
  values (NEW.id, company_id, 'gerente', profile_nome, now())
  on conflict (user_id) do update
  set
    company_id = excluded.company_id,
    role = excluded.role,
    nome = excluded.nome;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created_gerente on auth.users;
create trigger on_auth_user_created_gerente
after insert on auth.users
for each row execute procedure public.handle_gerente_onboarding();

commit;

