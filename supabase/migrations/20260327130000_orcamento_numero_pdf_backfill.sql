-- Backfill de numero_pdf por empresa sem depender de current_company_id().
-- Preenche registros antigos em ordem de created_at (e id como desempate).

begin;

create or replace function public.next_orcamento_numero_pdf_for_company(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n bigint;
  v_digits bigint;
  v_letter text;
  v_max_existing_n bigint := 0;
begin
  if p_company_id is null then
    return null;
  end if;

  -- Maior sequencial já persistido para a empresa, quando no formato esperado.
  select coalesce(
    max(
      ((split_part(o.numero_pdf, '-', 1))::bigint - 1) * 26
      + (ascii(split_part(o.numero_pdf, '-', 2)) - ascii('A') + 1)
    ),
    0
  )
  into v_max_existing_n
  from public.orcamentos o
  where o.company_id = p_company_id
    and o.numero_pdf ~ '^[0-9]+-[A-Z]$';

  -- Incremento atômico por empresa sem retroceder o contador
  -- caso já existam números gerados anteriormente.
  insert into public.orcamento_numeracao (company_id, next_n, updated_at)
  values (p_company_id, v_max_existing_n + 1, now())
  on conflict (company_id) do update
    set next_n = greatest(public.orcamento_numeracao.next_n, v_max_existing_n) + 1,
        updated_at = now()
  returning next_n into v_n;

  v_digits := ((v_n - 1) / 26) + 1;
  v_letter := chr((ascii('A') + ((v_n - 1) % 26))::integer);

  return lpad(v_digits::text, 4, '0') || '-' || v_letter;
end;
$$;

comment on function public.next_orcamento_numero_pdf_for_company(uuid)
is 'Gera o próximo numero_pdf para uma empresa específica (uso administrativo/backfill).';

revoke all on function public.next_orcamento_numero_pdf_for_company(uuid) from public;
revoke all on function public.next_orcamento_numero_pdf_for_company(uuid) from authenticated;

-- Mantém a RPC do app compatível, agora delegando para a versão por empresa.
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
grant execute on function public.next_orcamento_numero_pdf() to authenticated;

do $$
declare
  v_company_id uuid;
  v_orcamento_id uuid;
begin
  -- Backfill por empresa com ordenação estável.
  for v_company_id in
    select distinct o.company_id
    from public.orcamentos o
    where o.company_id is not null
      and (o.numero_pdf is null or btrim(o.numero_pdf) = '')
    order by o.company_id
  loop
    for v_orcamento_id in
      select o.id
      from public.orcamentos o
      where o.company_id = v_company_id
        and (o.numero_pdf is null or btrim(o.numero_pdf) = '')
      order by o.created_at, o.id
    loop
      update public.orcamentos
      set numero_pdf = public.next_orcamento_numero_pdf_for_company(v_company_id)
      where id = v_orcamento_id;
    end loop;
  end loop;
end;
$$;

commit;
