-- Migração: corrigir fluxo de status de orçamentos
--
-- 1. Adiciona 'pendente' e 'reprovado' ao enum status_type
-- 2. Migra registros 'rascunho' → 'pendente'
-- 3. Altera default da coluna status para 'pendente'
-- 4. Adiciona colunas de desconto (desconto_tipo, desconto_valor)
-- 5. Corrige policy de DELETE: somente gerente pode excluir

------------------------------------------------------------
-- 1. Novos valores no enum
------------------------------------------------------------
ALTER TYPE public.status_type ADD VALUE IF NOT EXISTS 'pendente';
ALTER TYPE public.status_type ADD VALUE IF NOT EXISTS 'reprovado';

------------------------------------------------------------
-- 2. Migrar dados existentes: rascunho → pendente
------------------------------------------------------------
UPDATE public.orcamentos SET status = 'pendente' WHERE status = 'rascunho';

------------------------------------------------------------
-- 3. Alterar default da coluna status
------------------------------------------------------------
ALTER TABLE public.orcamentos ALTER COLUMN status SET DEFAULT 'pendente';

------------------------------------------------------------
-- 4. Colunas de desconto
------------------------------------------------------------
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS desconto_tipo text CHECK (desconto_tipo IN ('percentual', 'fixo')),
  ADD COLUMN IF NOT EXISTS desconto_valor numeric(14,2) NOT NULL DEFAULT 0;

------------------------------------------------------------
-- 5. Corrigir DELETE: somente gerente pode excluir
------------------------------------------------------------

-- Remove todas as policies de DELETE existentes na tabela orcamentos
DROP POLICY IF EXISTS "orcamentos_delete_owner_or_gerente" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_delete_authenticated" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_delete_gerente_only" ON public.orcamentos;

CREATE POLICY "orcamentos_delete_gerente_only"
  ON public.orcamentos FOR DELETE
  TO authenticated
  USING (
    company_id = public.current_company_id()
    AND public.current_role() = 'gerente'
  );
