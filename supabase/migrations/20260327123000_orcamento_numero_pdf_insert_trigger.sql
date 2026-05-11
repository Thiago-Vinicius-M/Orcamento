-- Fallback de numeração curta no insert de orçamentos
-- Preenche numero_pdf automaticamente quando vier nulo/vazio.

begin;

create or replace function public.orcamentos_set_numero_pdf_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.numero_pdf is null or btrim(new.numero_pdf) = '' then
    new.numero_pdf := public.next_orcamento_numero_pdf();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orcamentos_set_numero_pdf_before_insert on public.orcamentos;

create trigger trg_orcamentos_set_numero_pdf_before_insert
before insert on public.orcamentos
for each row
execute function public.orcamentos_set_numero_pdf_before_insert();

comment on function public.orcamentos_set_numero_pdf_before_insert()
is 'Fallback: define orcamentos.numero_pdf no INSERT quando o campo vier nulo/vazio.';

commit;
