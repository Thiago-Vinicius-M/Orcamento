import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SearchableSelect } from './SearchableSelect'
import { formatCurrencyBRL } from '../domain/financeiro/moeda'
import { parseDecimalInput } from '../domain/financeiro/numero'
import { calcularSubtotalItem } from '../domain/orcamento/calculos'
import { PERCENTUAL_DESCONTO_VENDEDOR_TETO_EPS, formatTetoPercentualParaMensagem } from '../domain/orcamento/descontoVendedor'
import type { ItemForm } from '../application/orcamento/orcamentoNovoService'

type ProdutoRef = {
  id: string
  codigo: string
  nome: string
  preco_unitario: number
}

type ProdutoOption = {
  value: string
  label: string
  searchText: string
}

type FormErrors = {
  produto?: string
  quantidade?: string
  desconto?: string
}

type Props = {
  aberto: boolean
  editIndex: number | null
  dadosIniciais: ItemForm | null
  produtos: ProdutoRef[]
  loadingProdutos: boolean
  tetoDesconto: number | null
  role: 'gerente' | 'vendedor' | null
  onConfirmar: (item: ItemForm, editIndex: number | null) => void
  onFechar: () => void
}

const ITEM_VAZIO: ItemForm = {
  produto_id: '',
  quantidade: '1',
  preco_unitario: '',
  desconto_percentual: '0',
}

function normalizarQuantidade(raw: string): string {
  const n = Math.max(0, Math.round(parseDecimalInput(raw)))
  return String(n === 0 ? 1 : n)
}

export function ProdutoItemModal({
  aberto,
  editIndex,
  dadosIniciais,
  produtos,
  loadingProdutos,
  tetoDesconto,
  role,
  onConfirmar,
  onFechar,
}: Props) {
  const [form, setForm] = useState<ItemForm>(ITEM_VAZIO)
  const [erros, setErros] = useState<FormErrors>({})
  const overlayRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aberto) {
      setForm(dadosIniciais ?? ITEM_VAZIO)
      setErros({})
    }
  }, [aberto, dadosIniciais])

  useEffect(() => {
    if (!aberto) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onFechar()
        return
      }
      if (e.key === 'Tab') {
        const sheet = overlayRef.current?.querySelector('.produto-item-sheet') as HTMLElement | null
        if (!sheet) return
        const focusable = Array.from(
          sheet.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.closest('[aria-hidden="true"]'))
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [aberto, onFechar])

  if (!aberto) return null

  const produtoOptions: ProdutoOption[] = produtos.map((p) => ({
    value: p.id,
    label: p.codigo ? `${p.codigo} - ${p.nome}` : p.nome,
    searchText: [p.codigo, p.nome].filter(Boolean).join(' '),
  }))

  const produtoSelecionado = produtos.find((p) => p.id === form.produto_id) ?? null
  const qtd = parseDecimalInput(form.quantidade)
  const preco = parseDecimalInput(form.preco_unitario)
  const descPct = parseDecimalInput(form.desconto_percentual)
  const subtotal = calcularSubtotalItem(qtd, preco, descPct)
  const isEdicao = editIndex !== null

  function handleProdutoChange(id: string) {
    const produto = produtos.find((p) => p.id === id)
    setForm((prev) => ({
      ...prev,
      produto_id: id,
      preco_unitario: produto ? produto.preco_unitario.toFixed(2) : '',
    }))
    if (erros.produto) setErros((e) => ({ ...e, produto: undefined }))
  }

  function handleDescontoChange(valor: string) {
    setForm((prev) => ({ ...prev, desconto_percentual: valor }))
    if (erros.desconto) setErros((e) => ({ ...e, desconto: undefined }))
  }

  function validar(): FormErrors {
    const novosErros: FormErrors = {}

    if (!form.produto_id) {
      novosErros.produto = 'Selecione o produto.'
    }

    const qtdNum = parseDecimalInput(form.quantidade)
    if (!form.quantidade || qtdNum <= 0) {
      novosErros.quantidade = 'Quantidade deve ser maior que zero.'
    }

    const descNum = parseDecimalInput(form.desconto_percentual || '0')
    if (descNum < 0) {
      novosErros.desconto = 'Desconto não pode ser negativo.'
    } else if (descNum > 100) {
      novosErros.desconto = 'Desconto não pode ultrapassar 100%.'
    } else if (
      role === 'vendedor' &&
      tetoDesconto !== null &&
      descNum > tetoDesconto + PERCENTUAL_DESCONTO_VENDEDOR_TETO_EPS
    ) {
      novosErros.desconto = `Desconto acima do limite de ${formatTetoPercentualParaMensagem(tetoDesconto)}%.`
    }

    return novosErros
  }

  function handleConfirmar() {
    const novosErros = validar()
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros)
      return
    }

    const itemFinal: ItemForm = {
      ...form,
      quantidade: normalizarQuantidade(form.quantidade),
      desconto_percentual: form.desconto_percentual || '0',
    }
    onConfirmar(itemFinal, editIndex)
  }

  const titulo = isEdicao ? 'Editar item' : 'Adicionar item'

  const modal = (
    <div
      ref={overlayRef}
      className="produto-item-overlay"
      onClick={onFechar}
      role="presentation"
    >
      <div
        className="produto-item-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="produto-item-sheet__handle" aria-hidden="true" />

        <h2 className="produto-item-sheet__title">{titulo}</h2>

        <div className="produto-item-sheet__fields">
          <div className="form-row">
            <label htmlFor="pim_produto">Produto</label>
            <div ref={firstInputRef}>
              <SearchableSelect
                id="pim_produto"
                ariaLabel="Produto"
                options={produtoOptions}
                value={form.produto_id}
                onValueChange={handleProdutoChange}
                disabled={loadingProdutos}
                required
                emptySelectionLabel="Selecione o produto"
              />
            </div>
            {erros.produto && (
              <div className="form-error" role="alert">
                {erros.produto}
              </div>
            )}
          </div>

          <div className="form-row">
            <label htmlFor="pim_quantidade">Quantidade</label>
            <div className="qty-stepper">
              <button
                type="button"
                className="qty-stepper__btn"
                aria-label="Diminuir quantidade"
                onClick={() => {
                  const current = Math.round(parseDecimalInput(form.quantidade))
                  const next = Math.max(1, current - 1)
                  setForm((prev) => ({ ...prev, quantidade: String(next) }))
                  if (erros.quantidade) setErros((er) => ({ ...er, quantidade: undefined }))
                }}
              >
                −
              </button>
              <input
                id="pim_quantidade"
                className="input-control qty-stepper__input"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={form.quantidade}
                onChange={(e) => {
                  const val = e.target.value
                  setForm((prev) => ({ ...prev, quantidade: val }))
                  if (erros.quantidade) setErros((er) => ({ ...er, quantidade: undefined }))
                }}
                onBlur={(e) => {
                  const raw = e.currentTarget?.value ?? ''
                  setForm((prev) => ({ ...prev, quantidade: normalizarQuantidade(raw) }))
                }}
                required
              />
              <button
                type="button"
                className="qty-stepper__btn"
                aria-label="Aumentar quantidade"
                onClick={() => {
                  const current = Math.round(parseDecimalInput(form.quantidade))
                  setForm((prev) => ({ ...prev, quantidade: String(current + 1) }))
                  if (erros.quantidade) setErros((er) => ({ ...er, quantidade: undefined }))
                }}
              >
                +
              </button>
            </div>
            {erros.quantidade && (
              <div className="form-error" role="alert">
                {erros.quantidade}
              </div>
            )}
          </div>

          <div className="form-row">
            <label>Preço unitário</label>
            <span className={!produtoSelecionado ? 'text-muted' : undefined}>
              {produtoSelecionado ? formatCurrencyBRL(preco) : 'Selecione o produto'}
            </span>
          </div>

          <div className="form-row">
            <label htmlFor="pim_desconto">
              Desconto (%)
              {tetoDesconto !== null && role === 'vendedor' && (
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: '0.4rem' }}>
                  — máx. {formatTetoPercentualParaMensagem(tetoDesconto)}%
                </span>
              )}
            </label>
            <input
              id="pim_desconto"
              className="input-control"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              value={form.desconto_percentual}
              onChange={(e) => handleDescontoChange(e.target.value)}
              placeholder="0"
              aria-invalid={!!erros.desconto}
              aria-describedby={erros.desconto ? 'pim_desconto_erro' : undefined}
            />
            {erros.desconto && (
              <div id="pim_desconto_erro" className="form-error" role="alert">
                {erros.desconto}
              </div>
            )}
          </div>

          {produtoSelecionado && (
            <div className="produto-item-sheet__preview">
              <div className="produto-item-sheet__preview-label">Subtotal do item</div>
              <div className="produto-item-sheet__preview-value">{formatCurrencyBRL(subtotal)}</div>
              {descPct > 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)', marginTop: '0.2rem' }}>
                  Bruto: {formatCurrencyBRL(qtd * preco)} — Desconto: {formatCurrencyBRL(qtd * preco - subtotal)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="produto-item-sheet__actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onFechar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirmar}
            disabled={loadingProdutos}
          >
            {isEdicao ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
