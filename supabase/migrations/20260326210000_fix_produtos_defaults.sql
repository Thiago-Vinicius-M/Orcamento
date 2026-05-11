-- Adiciona DEFAULT nas colunas company_id e created_by da tabela produtos
-- para que o banco preencha automaticamente mesmo se o frontend omitir esses campos.

ALTER TABLE public.produtos
  ALTER COLUMN company_id SET DEFAULT public.current_company_id();

ALTER TABLE public.produtos
  ALTER COLUMN created_by SET DEFAULT auth.uid();
