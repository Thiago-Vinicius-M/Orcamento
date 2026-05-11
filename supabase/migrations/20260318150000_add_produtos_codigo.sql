-- Add produtos.codigo
-- - Preenche dados existentes de forma determinística a partir do UUID (id)
-- - Garante NOT NULL e UNIQUE (company_id, codigo) para evitar duplicidade por empresa

begin;

alter table public.produtos
  add column codigo text;

update public.produtos
set codigo = 'SCT' || replace(id::text, '-', '')
where codigo is null;

alter table public.produtos
  alter column codigo set not null;

alter table public.produtos
  add constraint produtos_company_id_codigo_unique unique (company_id, codigo);

commit;
