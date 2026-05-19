import type { OrcamentoPdfViewModel, PagamentoDetalheViewModel } from "../../../orcamentoPdfPresenter";
import {
  estimateHeightAviso,
  estimateHeightBoletoChips,
  estimateHeightCredito,
  estimateHeightSimples,
  estimateHeightTabelaBoleto,
  estimateHeightResumoBox,
} from "./renderers/index";

export function estimarAlturaPayment(model: OrcamentoPdfViewModel): number {
  const isBoleto = model.pagamentoDetalhes.some((d) => d.tipo === "boleto-chips");

  let contentH = 18; // section header height
  for (const d of model.pagamentoDetalhes as PagamentoDetalheViewModel[]) {
    if      (d.tipo === "credito-card")   contentH += estimateHeightCredito();
    else if (d.tipo === "boleto-chips")   contentH += estimateHeightBoletoChips();
    else if (d.tipo === "tabela-boleto")  contentH += estimateHeightTabelaBoleto(d.parcelas.length);
    else if (d.tipo === "aviso")          contentH += estimateHeightAviso();
    else if (d.tipo === "titulo")         contentH += estimateHeightSimples();
    else if (d.tipo === "linha")          contentH += 14;
    else if (d.tipo === "resumo")         contentH += 26;
  }

  if (isBoleto) {
    const resumoH = model.pagamentoResumoBox
      ? estimateHeightResumoBox(model.pagamentoResumoBox.length)
      : 0;
    const twoColH = Math.max(contentH - 80, resumoH);
    return 80 + twoColH + 40;
  }

  return contentH + 40;
}
