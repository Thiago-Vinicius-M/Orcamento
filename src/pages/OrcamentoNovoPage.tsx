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
          desconto={form.desconto}
          setDesconto={form.setDesconto}
          totais={form.totais}
          descontoVendedorMensagem={form.descontoVendedorMensagem}
          atualizarItem={form.atualizarItem}
          adicionarItem={form.adicionarItem}
          removerItem={form.removerItem}
          handleProdutoChange={form.handleProdutoChange}
        />
        <OrcamentoNovoCondicaoPagamento pagamento={form.pagamento} setPagamento={form.setPagamento} />
        <OrcamentoNovoAcoes saving={form.saving} submitDisabled={form.submitDisabled} navigate={form.navigate} />
      </form>
    </>
  )
}
