import type { OrcamentoPdfViewModel } from "./orcamentoPdfPresenter";
import {
  renderOrcamentoPdfLayout,
  type RenderizarOrcamentoPdfLayoutOptions,
} from "./layout/OrcamentoPdfLayout";

export type RenderizarOrcamentoPdfOptions = RenderizarOrcamentoPdfLayoutOptions;

export async function renderizarOrcamentoPdf(
  model: OrcamentoPdfViewModel,
  options?: RenderizarOrcamentoPdfOptions,
): Promise<Uint8Array> {
  return renderOrcamentoPdfLayout(model, options);
}
