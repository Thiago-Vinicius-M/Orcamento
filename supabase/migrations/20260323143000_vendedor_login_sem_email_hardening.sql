-- Endurece credenciais de vendedor para login por company_code + username + senha.
-- Mantém compatibilidade com colunas legadas e adiciona validações de consistência.

alter table public.vendedor_credentials
  add column if not exists auth_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists active boolean not null default true;

update public.vendedor_credentials
set auth_user_id = user_id
where auth_user_id is null;

alter table public.vendedor_credentials
  alter column auth_user_id set not null;

create unique index if not exists vendedor_credentials_auth_user_id_uk
  on public.vendedor_credentials (auth_user_id);

-- Garante unicidade de username por empresa sem diferença de caixa.
create unique index if not exists vendedor_credentials_company_username_lower_uk
  on public.vendedor_credentials (company_id, lower(username));

alter table public.vendedor_credentials
  add constraint vendedor_credentials_username_not_blank_ck
  check (length(btrim(username)) >= 3);

create or replace function public.normalize_vendedor_username()
returns trigger
language plpgsql
as $$
begin
  new.username := lower(btrim(new.username));
  return new;
end;
$$;

drop trigger if exists trg_normalize_vendedor_username on public.vendedor_credentials;
create trigger trg_normalize_vendedor_username
before insert or update of username
on public.vendedor_credentials
for each row
execute function public.normalize_vendedor_username();

create or replace function public.ensure_vendedor_credential_consistency()
returns trigger
language plpgsql
as $$
declare
  profile_company_id uuid;
  profile_role public.role_type;
begin
  select p.company_id, p.role
    into profile_company_id, profile_role
  from public.profiles p
  where p.user_id = new.auth_user_id;

  if profile_company_id is null then
    raise exception 'Perfil do vendedor nao encontrado para user_id=%', new.auth_user_id;
  end if;

  if profile_role <> 'vendedor' then
    raise exception 'Perfil inconsistente: usuario % nao e vendedor', new.auth_user_id;
  end if;

  if profile_company_id <> new.company_id then
    raise exception 'Perfil inconsistente: company_id de credencial e perfil divergentes para user_id=%', new.auth_user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_vendedor_credential_consistency on public.vendedor_credentials;
create constraint trigger trg_ensure_vendedor_credential_consistency
after insert or update of company_id, auth_user_id
on public.vendedor_credentials
deferrable initially deferred
for each row
execute function public.ensure_vendedor_credential_consistency();

-- Evita duas credenciais para o mesmo usuário auth, mesmo com coluna legada user_id.
create unique index if not exists vendedor_credentials_user_id_uk
  on public.vendedor_credentials (user_id);
