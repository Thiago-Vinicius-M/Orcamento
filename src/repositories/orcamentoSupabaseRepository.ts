/**
 * @deprecated Importe a partir de `./orcamento/*` (módulos coesos).
 * Este arquivo permanece como fachada fina para compatibilidade fora de `src/application` e `src/pages`.
 */

export type { OrcamentoContext } from './orcamento/orcamentoContextProvider'
export {
  createOrcamentoContextProvider,
  defaultOrcamentoContextProvider,
  getOrcamentoContext,
  getOrcamentoContextWithClient,
} from './orcamento/orcamentoContextProvider'

export {
  createOrcamentoNumeracaoService,
  defaultOrcamentoNumeracaoService,
  nextOrcamentoNumeroPdf,
  nextOrcamentoNumeroPdfWithClient,
} from './orcamento/orcamentoNumeracaoService'

export {
  createProfileRepo,
  defaultProfileRepo,
  loadProfilesDaEmpresaParaFiltro,
  loadProfilesDaEmpresaParaFiltroWithClient,
} from './orcamento/profileRepo'

export type {
  ClienteRef,
  OrcamentosListFiltros,
  ProdutoRef,
} from './orcamento/orcamentoReadRepo'
export {
  createOrcamentoReadRepo,
  defaultOrcamentoReadRepo,
  findOrcamentoIdByNumeroPdf,
  findOrcamentoIdByNumeroPdfWithClient,
  listOrcamentosComFiltros,
  listOrcamentosComFiltrosWithClient,
  loadOrcamentoDetalheRaw,
  loadOrcamentoDetalheRawWithClient,
  loadOrcamentoReferences,
  loadOrcamentoReferencesWithClient,
} from './orcamento/orcamentoReadRepo'

export type {
  OrcamentoPdfClienteRow,
  OrcamentoPdfDataRaw,
  OrcamentoPdfEmpresaRow,
  OrcamentoPdfItemRow,
  OrcamentoPdfOrcamentoRow,
  OrcamentoPdfPagamentoRow,
} from './orcamento/orcamentoPdfRepo'
export {
  createOrcamentoPdfRepo,
  defaultOrcamentoPdfRepo,
  loadOrcamentoPdfData,
  loadOrcamentoPdfDataWithClient,
} from './orcamento/orcamentoPdfRepo'

export {
  atualizarStatusOrcamento,
  atualizarStatusOrcamentoWithClient,
  createOrcamentoWriteRepo,
  defaultOrcamentoWriteRepo,
  excluirOrcamento,
  excluirOrcamentoWithClient,
  insertOrcamento,
  insertOrcamentoItens,
  insertOrcamentoPagamento,
  insertOrcamentoItensWithClient,
  insertOrcamentoPagamentoWithClient,
  insertOrcamentoWithClient,
} from './orcamento/orcamentoWriteRepo'
