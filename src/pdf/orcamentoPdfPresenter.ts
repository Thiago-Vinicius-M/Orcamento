import { formatCurrencyBRL } from "../domain/financeiro/moeda";
import { calcularResumoFinanciamento } from "../domain/orcamento/calculos";
import type { Orcamento } from "../types/orcamento";

export interface OrcamentoPdfItemViewModel {
  descricao: string;
  quantidade: string;
  precoUnitario: string;
  subtotal: string;
}

export interface OrcamentoPdfRodapeViewModel {
  empresaNome: string;
  contato: string;
}

export interface OrcamentoPdfViewModel {
  empresaNome: string;
  empresaLinhas: string[];
  /** Título principal do documento (ex.: "Orçamento"). */
  tituloDocumento: string;
  /** Identificação do orçamento (ex.: "Nº 2024-001"). */
  orcamentoNumero: string;
  status: string;
  dataEmissao: string;
  dataValidade: string;
  clienteLinhas: string[];
  itens: OrcamentoPdfItemViewModel[];
  totais: {
    subtotal: string;
    descontos: string;
    taxas: string;
    total: string;
    /** Rótulo explicando a origem do desconto (vazio se não houver desconto). */
    rotuloDesconto: string;
    /** Valor do desconto já formatado em moeda com sinal negativo. */
    descontoValorDisplay: string;
    /** Rótulo da taxa, ex.: "Taxa de serviço (10%)" (vazio se não houver taxa). */
    rotuloTaxa: string;
    mostrarDesconto: boolean;
    mostrarTaxa: boolean;
  };
  pagamentoResumo: string;
  avisoValidade: string;
  /** Texto padrão de termos para o rodapé do PDF. */
  termosCondicoes: string;
  /** Texto livre de observações do orçamento (quando houver). */
  observacoes?: string;
  /** Linha “Gerado por: …” no cabeçalho (somente quando houver nome). */
  geradoPorLinha?: string;
  /** Dados para rodapé em todas as páginas do PDF. */
  rodape: OrcamentoPdfRodapeViewModel;
}

function formatCurrency(value: number): string {
  return formatCurrencyBRL(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function formatDateFromDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

function calcularValidade30Dias(criadoEm: string, fallbackValidadeAte?: string): string {
  const base = new Date(criadoEm);
  if (!Number.isNaN(base.getTime())) {
    const validade = new Date(base);
    validade.setDate(validade.getDate() + 30);
    return formatDateFromDate(validade);
  }
  return fallbackValidadeAte ? formatDate(fallbackValidadeAte) : "";
}

function formatPercentualTaxaLabel(pct: number): string {
  if (Number.isInteger(pct)) return String(pct);
  return pct.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function rotuloDescontoPdf(orcamento: Orcamento): string {
  const d = orcamento.descontos ?? 0;
  if (d <= 0) return "";
  const escopo = orcamento.desconto_aplicacao ?? "total";
  return escopo === "itens"
    ? "Desconto aplicado nos itens"
    : "Desconto aplicado no valor total";
}

function rotuloTaxaServicoPdf(orcamento: Orcamento, taxasValor: number): string {
  if (taxasValor <= 0) return "";
  const aplicar = orcamento.pagamento.aplicar_taxa ?? false;
  const pct = orcamento.pagamento.taxa_servico_percentual;
  if (aplicar && pct != null && pct > 0) {
    return `Taxa de serviço (${formatPercentualTaxaLabel(pct)}%)`;
  }
  return "Taxa de serviço";
}

function buildRodapeContato(orcamento: Orcamento): string {
  return [orcamento.empresa.telefone, orcamento.empresa.email]
    .filter(Boolean)
    .join(" | ");
}

function buildPagamentoResumo(orcamento: Orcamento): string {
  const { pagamento, total } = orcamento;
  const base = `Forma: ${pagamento.tipo}`;

  if (pagamento.tipo !== "financiamento") {
    return base;
  }

  const { entrada, valorFinanciado, parcelas, taxa, aplicarTaxa, valorParcela } =
    calcularResumoFinanciamento({
      total,
      valor_entrada: pagamento.valor_entrada ?? null,
      num_parcelas: pagamento.num_parcelas ?? null,
      taxa_servico_percentual: pagamento.taxa_servico_percentual ?? null,
      aplicar_taxa: pagamento.aplicar_taxa ?? false
    });

  const taxaNominalTotal =
    aplicarTaxa && taxa > 0 ? Math.max(0, valorFinanciado * (taxa / 100)) : 0;
  const taxaPorParcela =
    taxaNominalTotal > 0 && parcelas > 0 ? taxaNominalTotal / parcelas : 0;

  return [
    base,
    `Entrada: ${formatCurrency(entrada)}`,
    `Valor financiado: ${formatCurrency(valorFinanciado)}`,
    aplicarTaxa && taxa > 0 ? `Taxa serviço: ${taxa.toFixed(2)}%` : undefined,
    `Parcelas: ${parcelas} x ${formatCurrency(valorParcela)} | Incluindo ${formatCurrency(taxaPorParcela)} de taxa por parcela`
  ]
    .filter(Boolean)
    .join(" | ");
}

const TERMOS_PADRAO_PDF =
  "Os valores e condições deste documento constituem proposta comercial. A aceitação formal do orçamento e o cumprimento da forma de pagamento acordada caracterizam o fechamento do negócio. Mercadorias e prazos ficam sujeitos à disponibilidade e confirmação no momento da contratação.";

export function apresentarOrcamentoPdf(orcamento: Orcamento): OrcamentoPdfViewModel {
  const numero = (orcamento.numero ?? "").trim();
  const observacoesTrim = orcamento.observacoes?.trim();
  const observacoes =
    observacoesTrim && observacoesTrim.length > 0 ? observacoesTrim : undefined;

  const descontos = orcamento.descontos ?? 0;
  const taxasValor = Math.max(0, orcamento.total - orcamento.subtotal + descontos);
  const mostrarDesconto = descontos > 0;
  const mostrarTaxa = taxasValor > 0;

  const geradoPorNome = orcamento.gerado_por_nome?.trim();
  const geradoPorLinha =
    geradoPorNome && geradoPorNome.length > 0 ? `Gerado por: ${geradoPorNome}` : undefined;

  return {
    empresaNome: orcamento.empresa.nome,
    empresaLinhas: [
      orcamento.empresa.documento ? `CNPJ/CPF: ${orcamento.empresa.documento}` : null,
      orcamento.empresa.endereco ?? null,
      orcamento.empresa.telefone || orcamento.empresa.email
        ? `Contato: ${[orcamento.empresa.telefone, orcamento.empresa.email].filter(Boolean).join(" | ")}`
        : null
    ].filter((line): line is string => Boolean(line)),
    tituloDocumento: "Orçamento",
    // Nunca exibir UUID no PDF; se não houver número curto, manter neutro.
    orcamentoNumero: numero ? `Nº ${numero}` : "Nº —",
    status: `Status: ${orcamento.status.toUpperCase()}`,
    dataEmissao: formatDate(orcamento.criado_em),
    dataValidade: calcularValidade30Dias(orcamento.criado_em, orcamento.validade_ate),
    clienteLinhas: [
      orcamento.cliente.nome,
      orcamento.cliente.documento ? `Documento: ${orcamento.cliente.documento}` : null,
      orcamento.cliente.endereco ? `Endereço: ${orcamento.cliente.endereco}` : null,
      orcamento.cliente.telefone || orcamento.cliente.email
        ? `Contato: ${[orcamento.cliente.telefone, orcamento.cliente.email].filter(Boolean).join(" | ")}`
        : null
    ].filter((line): line is string => Boolean(line)),
    itens: orcamento.itens.map((item) => ({
      descricao: item.nome_produto,
      quantidade: item.quantidade.toString(),
      precoUnitario: formatCurrency(item.preco_unitario),
      subtotal: formatCurrency(item.subtotal)
    })),
    totais: {
      subtotal: formatCurrency(orcamento.subtotal),
      descontos: formatCurrency(descontos),
      taxas: formatCurrency(taxasValor),
      total: formatCurrency(orcamento.total),
      rotuloDesconto: mostrarDesconto ? rotuloDescontoPdf(orcamento) : "",
      descontoValorDisplay: formatCurrency(-descontos),
      rotuloTaxa: mostrarTaxa ? rotuloTaxaServicoPdf(orcamento, taxasValor) : "",
      mostrarDesconto,
      mostrarTaxa
    },
    pagamentoResumo: buildPagamentoResumo(orcamento),
    termosCondicoes: TERMOS_PADRAO_PDF,
    avisoValidade:
      "Este orçamento é válido somente até a data indicada acima. Valores podem sofrer alteração após o vencimento.",
    ...(observacoes !== undefined ? { observacoes } : {}),
    ...(geradoPorLinha !== undefined ? { geradoPorLinha } : {}),
    rodape: {
      empresaNome: orcamento.empresa.nome,
      contato: buildRodapeContato(orcamento)
    }
  };
}
