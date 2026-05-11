-- Recria a RPC de geração de numero_pdf no formato 0001-A.
-- Regra:
-- - Sem registros válidos: 0001-A
-- - Número < 9999: incrementa número e mantém letra
-- - Número = 9999: volta para 0001 e incrementa letra (Z volta para A)

begin;

drop function if exists public.next_orcamento_numero_pdf();

create or replace function public.next_orcamento_numero_pdf()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_numero_pdf text;
  v_num integer;
  v_letter text;
  v_next_num integer;
  v_next_letter text;
begin
  select o.numero_pdf
  into v_last_numero_pdf
  from public.orcamentos o
  where o.numero_pdf ~ '^\d{4}-[A-Z]$'
  order by
    split_part(o.numero_pdf, '-', 1)::integer desc,
    split_part(o.numero_pdf, '-', 2) desc
  limit 1;

  if v_last_numero_pdf is null then
    return '0001-A';
  end if;

  v_num := split_part(v_last_numero_pdf, '-', 1)::integer;
  v_letter := split_part(v_last_numero_pdf, '-', 2);

  if v_num < 9999 then
    v_next_num := v_num + 1;
    v_next_letter := v_letter;
  else
    v_next_num := 1;
    if v_letter = 'Z' then
      v_next_letter := 'A';
    else
      v_next_letter := chr((ascii(v_letter) + 1)::integer);
    end if;
  end if;

  return lpad(v_next_num::text, 4, '0') || '-' || v_next_letter;
end;
$$;

revoke all on function public.next_orcamento_numero_pdf() from public;
revoke all on function public.next_orcamento_numero_pdf() from anon;
revoke all on function public.next_orcamento_numero_pdf() from authenticated;
revoke all on function public.next_orcamento_numero_pdf() from service_role;

grant execute on function public.next_orcamento_numero_pdf() to anon;
grant execute on function public.next_orcamento_numero_pdf() to authenticated;
grant execute on function public.next_orcamento_numero_pdf() to service_role;

commit;
