-- Adiciona suporte a parcelamento para Crédito e Boleto.
-- Campos são nullable: orçamentos existentes não são afetados.
ALTER TABLE public.orcamento_pagamento
  ADD COLUMN primeiro_vencimento date,
  ADD COLUMN intervalo_dias integer
    CHECK (intervalo_dias IS NULL OR intervalo_dias >= 1);
