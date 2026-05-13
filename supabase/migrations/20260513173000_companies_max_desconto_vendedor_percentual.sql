-- Teto opcional de desconto para vendedores (% sobre o subtotal do orçamento).
-- NULL = sem limite (empresas existentes e padrão até o gerente configurar).

alter table public.companies
  add column if not exists max_desconto_vendedor_percentual numeric(5,2);

comment on column public.companies.max_desconto_vendedor_percentual is
  'Percentual máximo de desconto permitido para perfil vendedor (0 a 100). NULL indica ausência de teto.';

alter table public.companies
  drop constraint if exists companies_max_desconto_vendedor_percentual_range;

alter table public.companies
  add constraint companies_max_desconto_vendedor_percentual_range
  check (
    max_desconto_vendedor_percentual is null
    or (max_desconto_vendedor_percentual >= 0 and max_desconto_vendedor_percentual <= 100)
  );
