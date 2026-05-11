-- Fix: renomeia variáveis PL/pgSQL que colidem com nomes de colunas em
-- companies e profiles (razao_social, cnpj, login_code, company_id).
-- O PostgreSQL 17 levanta SQLSTATE 42702 ("column reference is ambiguous")
-- quando variável e coluna têm o mesmo nome, causando o erro genérico
-- "Database error saving new user" no GoTrue.
--
-- Também envolve o corpo em BEGIN...EXCEPTION para que falhas internas
-- NÃO bloqueiem a criação do usuário em auth.users.

begin;

create or replace function public.handle_gerente_onboarding()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_meta_user  jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_meta_app   jsonb := coalesce(NEW.raw_app_meta_data, '{}'::jsonb);

  v_auth_role text := coalesce(
    nullif(btrim(v_meta_user ->> 'role'), ''),
    nullif(btrim(v_meta_app  ->> 'role'), '')
  );

  v_razao_social text := coalesce(
    nullif(btrim(v_meta_user ->> 'razao_social'), ''),
    nullif(btrim(v_meta_app  ->> 'razao_social'), '')
  );

  v_cnpj text := coalesce(
    nullif(btrim(v_meta_user ->> 'cnpj'), ''),
    nullif(btrim(v_meta_app  ->> 'cnpj'), '')
  );

  v_profile_nome text := coalesce(
    nullif(btrim(v_meta_user ->> 'nome'), ''),
    nullif(btrim(v_meta_app  ->> 'nome'), '')
  );

  v_login_code_input text := coalesce(
    nullif(btrim(v_meta_user ->> 'login_code'), ''),
    nullif(btrim(v_meta_app  ->> 'login_code'), '')
  );

  v_login_code text;
  v_company_id uuid;
begin
  if v_auth_role = 'vendedor' then
    return NEW;
  end if;

  if v_auth_role is not null and v_auth_role <> 'gerente' then
    return NEW;
  end if;

  if v_razao_social is null then
    v_razao_social := v_profile_nome;
  end if;
  if v_profile_nome is null then
    v_profile_nome := v_razao_social;
  end if;

  if v_razao_social is null or v_profile_nome is null then
    return NEW;
  end if;

  if v_login_code_input is not null then
    v_login_code := v_login_code_input;
  else
    v_login_code := upper(substring(encode(digest(NEW.id::text, 'sha256'), 'hex') from 1 for 10));
  end if;

  -- Bloco protegido: falhas aqui NÃO propagam para o GoTrue,
  -- permitindo que auth.users seja criado mesmo se o onboarding falhar.
  -- A Edge Function ou ensure_gerente_profile() podem reparar depois.
  begin
    select p.company_id
      into v_company_id
    from public.profiles p
    where p.user_id = NEW.id
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
    values (NEW.id, v_company_id, 'gerente', v_profile_nome, now())
    on conflict (user_id) do update
    set
      company_id = excluded.company_id,
      role       = excluded.role,
      nome       = excluded.nome;

  exception when others then
    raise warning 'handle_gerente_onboarding failed for user %: % [%]',
      NEW.id, SQLERRM, SQLSTATE;
  end;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created_gerente on auth.users;
create trigger on_auth_user_created_gerente
after insert on auth.users
for each row execute procedure public.handle_gerente_onboarding();

commit;
