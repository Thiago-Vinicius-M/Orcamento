-- Gerente onboarding:
-- - Quando um usuário Auth for criado como "gerente", criar:
--   - public.companies (com login_code gerado automaticamente quando não fornecido)
--   - public.profiles (role='gerente')
-- - Ignorar usuários criados como "vendedor" (criados pela edge function create-vendedor).

begin;

-- Garante suporte a `digest/encode` para geração determinística do `login_code`.
create extension if not exists pgcrypto;

create or replace function public.handle_gerente_onboarding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := NEW.raw_user_meta_data;
  auth_role text := meta ->> 'role';

  razao_social text := meta ->> 'razao_social';
  cnpj text := meta ->> 'cnpj';

  login_code_input text := meta ->> 'login_code';
  login_code text;

  company_id uuid;
  profile_nome text;
begin
  -- Vendedores são criados pela edge function `create-vendedor`.
  -- Ela já insere tanto `companies`/`profiles` quanto `vendedor_credentials`.
  if auth_role = 'vendedor' then
    return NEW;
  end if;

  -- Garante que só cria estrutura para o cadastro de gerente.
  -- (Por enquanto o frontend salva `razao_social` como user_metadata.)
  if razao_social is null or btrim(razao_social) = '' then
    return NEW;
  end if;

  profile_nome := meta ->> 'nome';
  if profile_nome is null or btrim(profile_nome) = '' then
    -- Compatibilidade com o schema atual/legacy: resolve nome a partir da razão social.
    profile_nome := razao_social;
  end if;

  if login_code_input is not null and btrim(login_code_input) <> '' then
    login_code := login_code_input;
  else
    -- Código deterministico (baseado no UUID) para não depender do usuário.
    login_code := upper(substring(encode(digest(NEW.id::text, 'sha256'), 'hex') from 1 for 10));
  end if;

  begin
    insert into public.companies (razao_social, cnpj, login_code, created_at)
    values (razao_social, cnpj, login_code, now())
    returning id into company_id;
  exception
    when unique_violation then
      -- Se o código fornecido pelo frontend colidir, fazemos fallback para um
      -- código deterministico baseado no UUID do usuário.
      login_code := upper(substring(encode(digest(NEW.id::text, 'sha256'), 'hex') from 1 for 10));

      insert into public.companies (razao_social, cnpj, login_code, created_at)
      values (razao_social, cnpj, login_code, now())
      returning id into company_id;
  end;

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

