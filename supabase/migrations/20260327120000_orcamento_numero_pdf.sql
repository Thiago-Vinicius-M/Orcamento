-- Numeração curta do orçamento para PDF (por empresa)
-- Formato: 0001-A, 0001-B, ..., 0001-Z, 0002-A, ...
-- n=1 -> 0001-A
-- digits = floor((n-1)/26)+1 (padded 4), letter = A + ((n-1) % 26)

begin;

-- 1) Coluna persistida no orçamento + unicidade por empresa
alter table public.orcamentos
  add column if not exists numero_pdf text;

create unique index if not exists orcamentos_company_numero_pdf_uidx
  on public.orcamentos (company_id, numero_pdf)
  where numero_pdf is not null;

-- 2) Tabela de controle do contador por empresa
create table if not exists public.orcamento_numeracao (
  company_id uuid primary key references public.companies (id) on delete cascade,
  next_n bigint not null check (next_n >= 1),
  updated_at timestamptz not null default now()
);

-- 3) RPC para obter o próximo número curto (atômico por empresa)
create or replace function public.next_orcamento_numero_pdf()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_n bigint;
  v_digits bigint;
  v_letter text;
begin
  if v_company_id is null then
    return null;
  end if;

  -- Incremento atômico por empresa:
  -- - se não existir, cria com next_n=1 e usa 1
  -- - se existir, soma 1 e usa o novo valor
  insert into public.orcamento_numeracao (company_id, next_n, updated_at)
  values (v_company_id, 1, now())
  on conflict (company_id) do update
    set next_n = public.orcamento_numeracao.next_n + 1,
        updated_at = now()
  returning next_n into v_n;

  v_digits := ((v_n - 1) / 26) + 1;
  v_letter := chr((ascii('A') + ((v_n - 1) % 26))::integer);

  return lpad(v_digits::text, 4, '0') || '-' || v_letter;
end;
$$;

comment on function public.next_orcamento_numero_pdf()
is 'Gera o próximo identificador curto (0000-X) por empresa para persistir em orcamentos.numero_pdf.';

revoke all on function public.next_orcamento_numero_pdf() from public;
grant execute on function public.next_orcamento_numero_pdf() to authenticated;

-- Endurece permissões da tabela de controle (acesso direto não é necessário no app)
revoke all on table public.orcamento_numeracao from public;
revoke all on table public.orcamento_numeracao from authenticated;

commit;

