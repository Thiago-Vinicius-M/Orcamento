import type { Orcamento } from "../types/orcamento";
import { apresentarOrcamentoPdf } from "./orcamentoPdfPresenter";
import { renderizarOrcamentoPdf } from "./orcamentoPdfRenderer";

export async function gerarPdfOrcamento(orcamento: Orcamento): Promise<Uint8Array> {
  const modelo = apresentarOrcamentoPdf(orcamento);
  return renderizarOrcamentoPdf(modelo);
}

