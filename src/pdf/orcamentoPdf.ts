import type { Orcamento } from "../types/orcamento";
import { apresentarOrcamentoPdf } from "./orcamentoPdfPresenter";
import { renderizarOrcamentoPdf } from "./orcamentoPdfRenderer";

export async function gerarPdfOrcamento(
  orcamento: Orcamento,
  options?: { logoUrl?: string },
): Promise<Uint8Array> {
  const modelo = apresentarOrcamentoPdf(orcamento, options);
  return renderizarOrcamentoPdf(modelo);
}

