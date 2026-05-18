ALTER TABLE orcamento_itens
  ADD COLUMN IF NOT EXISTS desconto_percentual numeric(5,2) NOT NULL DEFAULT 0
    CONSTRAINT orcamento_itens_desconto_percentual_range
    CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100);
