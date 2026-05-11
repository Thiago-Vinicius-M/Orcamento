-- O trigger em auth.users insere em public.companies / public.profiles com RLS ativo.
-- Em PG15+ o dono da tabela não ignora RLS por padrão; sem isso o signup falha com
-- "Database error saving new user" (GoTrue esconde o detalhe do Postgres).
-- SET row_security = off na função SECURITY DEFINER (dono superuser) é o padrão seguro aqui.

begin;

alter function public.handle_gerente_onboarding() set row_security to off;

commit;
