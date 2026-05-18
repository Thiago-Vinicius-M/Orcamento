import { useOrcamentoNovoForm } from '../hooks/useOrcamentoNovoForm'
import { OrcamentoNovoAcoes } from './OrcamentoNovo/OrcamentoNovoAcoes'
import { OrcamentoNovoCabecalho } from './OrcamentoNovo/OrcamentoNovoCabecalho'
import { OrcamentoNovoCondicaoPagamento } from './OrcamentoNovo/OrcamentoNovoCondicaoPagamento'
import { OrcamentoNovoItensEditor } from './OrcamentoNovo/OrcamentoNovoItensEditor'

export function OrcamentoNovoPage() {
  const form = useOrcamentoNovoForm()

  return (
    <>
      <h1>Novo orçamento</h1>
      <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
        Monte o orçamento com itens de produtos e defina a condição de pagamento. A validade padrão é de 30 dias a
        partir de hoje.
      </p>

      {form.error && (
        <div className="page-error" role="alert" aria-live="assertive">
          {form.error}
        </div>
      )}

      <form onSubmit={form.handleSubmit} className="page-grid" style={{ marginTop: '1rem' }}>
        <OrcamentoNovoCabecalho
          clientes={form.clientes}
          clienteId={form.clienteId}
          setClienteId={form.setClienteId}
          loadingRefs={form.loadingRefs}
        />
        <OrcamentoNovoItensEditor
          produtos={form.produtos}
          itens={form.itens}
          loadingRefs={form.loadingRefs}
          totais={form.totais}
          descontoVendedorMensagem={form.descontoVendedorMensagem}
          tetoDescontoVendedor={form.tetoDescontoVendedor}
          role={form.role}
          modalAberto={form.modalAberto}
          modalEditIndex={form.modalEditIndex}
          abrirModalNovo={form.abrirModalNovo}
          abrirModalEditar={form.abrirModalEditar}
          fecharModal={form.fecharModal}
          salvarItemModal={form.salvarItemModal}
          removerItem={form.removerItem}
        />
        <OrcamentoNovoCondicaoPagamento
          pagamento={form.pagamento}
          setPagamento={form.setPagamento}
          totais={form.totais}
        />
        <OrcamentoNovoAcoes saving={form.saving} submitDisabled={form.submitDisabled} navigate={form.navigate} />
      </form>
    </>
  )
}
