import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import {
  ArrowLeft,
  Pencil,
  Copy,
  FileDown,
  CheckCircle,
  XCircle,
  Calendar,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { orcamentoService } from "@/services/orcamentoService"
import { LoadingState } from "@/components/LoadingState"
import {
  formatCurrency,
  formatDate,
  formatCpfCnpj,
  formatPhone,
  formatNumeroOrcamento,
} from "@/lib/formatters"
import { toast } from "sonner"
import { STATUS_STYLES, STATUS_ORCAMENTO_LABELS, FORMA_PAGAMENTO_LABELS } from "@/lib/constants"
import { useOrcamentoActions } from "@/hooks/useOrcamentoActions"
import { canChangeStatus } from "@/lib/orcamentoDomain"
import type { StatusOrcamento } from "@/types"

export function OrcamentoViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [statusAction, setStatusAction] = useState<StatusOrcamento | null>(
    null,
  )
  const {
    duplicating,
    handleDuplicate,
    handleGeneratePdf,
  } = useOrcamentoActions()

  const data = useLiveQuery(async () => {
    if (!id) return null
    return (await orcamentoService.getByIdWithDetails(Number(id))) ?? null
  }, [id])

  async function handleStatusChange() {
    if (!statusAction || !id) return
    try {
      await orcamentoService.updateStatus(Number(id), statusAction)
      toast.success(
        statusAction === "aprovado"
          ? "Orçamento aprovado com sucesso!"
          : "Orçamento cancelado.",
      )
    } catch {
      toast.error("Erro ao alterar status do orçamento.")
    }
    setStatusAction(null)
  }

  if (data === undefined) {
    return <LoadingState />
  }

  if (data === null) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <h3 className="text-lg font-semibold">Orçamento não encontrado</h3>
        <Button onClick={() => navigate("/orcamentos")} className="mt-4">
          Voltar para Orçamentos
        </Button>
      </div>
    )
  }

  const { orcamento, itens, condicoes, cliente, produtosMap } = data
  const fmtNum = formatNumeroOrcamento(orcamento.numero)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 mt-1 sm:mt-0"
          onClick={() => navigate("/orcamentos")}
        >
          <ArrowLeft />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Orçamento {fmtNum}
            </h2>
            <Badge
              variant={
                orcamento.status === "cancelado" ? "outline" : "default"
              }
              className={STATUS_STYLES[orcamento.status]}
            >
              {STATUS_ORCAMENTO_LABELS[orcamento.status]}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Emissão: {formatDate(new Date(orcamento.dataEmissao))}
            </span>
            <span>
              Validade: {formatDate(new Date(orcamento.dataValidade))}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/orcamentos/${id}/editar`)}
        >
          <Pencil />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDuplicate(Number(id))}
          disabled={duplicating}
        >
          <Copy />
          Duplicar
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleGeneratePdf(Number(id))}>
          <FileDown />
          PDF
        </Button>
        {canChangeStatus(orcamento, "aprovado") && (
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 hover:text-blue-600"
            onClick={() => setStatusAction("aprovado")}
          >
            <CheckCircle />
            Aprovar
          </Button>
        )}
        {canChangeStatus(orcamento, "cancelado") && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setStatusAction("cancelado")}
          >
            <XCircle />
            Cancelar
          </Button>
        )}
      </div>

      <Separator />

      {/* Client */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Cliente
        </h3>
        {cliente ? (
          <div className="rounded-lg border bg-card p-4">
            <p className="font-semibold">{cliente.nome}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{formatCpfCnpj(cliente.cpfCnpj)}</span>
              {cliente.telefone && (
                <span>{formatPhone(cliente.telefone)}</span>
              )}
              {cliente.email && <span>{cliente.email}</span>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Cliente removido do sistema.
          </p>
        )}
      </section>

      <Separator />

      {/* Items */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Itens</h3>

        {/* Desktop Table */}
        <div className="hidden sm:block rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center w-[80px]">Qtd</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => {
                const produto = produtosMap.get(item.produtoId)
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {produto?.nome ?? "Produto removido"}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantidade}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.precoUnitario)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="flex flex-col gap-2 sm:hidden">
          {itens.map((item) => {
            const produto = produtosMap.get(item.produtoId)
            return (
              <div
                key={item.id}
                className="rounded-lg border bg-card p-3 space-y-1.5"
              >
                <p className="font-medium text-sm">
                  {produto?.nome ?? "Produto removido"}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {item.quantidade}x {formatCurrency(item.precoUnitario)}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Summary */}
      <div className="rounded-lg border bg-muted/50 p-4 space-y-2 sm:max-w-sm sm:ml-auto">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(orcamento.subtotal)}</span>
        </div>
        {(orcamento.descontoValor > 0 ||
          orcamento.descontoPercentual > 0) && (
          <div className="flex justify-between text-sm text-destructive">
            <span>
              Desconto
              {orcamento.descontoPercentual > 0
                ? ` (${orcamento.descontoPercentual}%)`
                : ""}
            </span>
            <span>- {formatCurrency(orcamento.descontoValor)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>{formatCurrency(orcamento.total)}</span>
        </div>
      </div>

      <Separator />

      {/* Payment Conditions */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Condições de Pagamento</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {condicoes.map((cond) => (
            <div
              key={cond.id}
              className="rounded-lg border bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {FORMA_PAGAMENTO_LABELS[cond.formaPagamento] ??
                    cond.formaPagamento}
                </Badge>
                {cond.descontoPercentual > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {cond.descontoPercentual}% desc.
                  </span>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {cond.parcelas}x de {formatCurrency(cond.valorParcela)}
              </div>
              <p className="text-sm text-muted-foreground">
                Total: {formatCurrency(cond.valorTotal)}
              </p>
              {cond.observacoes && (
                <p className="text-xs text-muted-foreground italic">
                  {cond.observacoes}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Notes */}
      {orcamento.observacoes && (
        <>
          <Separator />
          <section className="space-y-2">
            <h3 className="text-lg font-semibold">Observações</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {orcamento.observacoes}
            </p>
          </section>
        </>
      )}

      {/* Status Change Dialog */}
      <AlertDialog
        open={!!statusAction}
        onOpenChange={(open) => !open && setStatusAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusAction === "aprovado"
                ? "Aprovar orçamento?"
                : "Cancelar orçamento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusAction === "aprovado"
                ? `O orçamento ${fmtNum} será marcado como aprovado.`
                : `O orçamento ${fmtNum} será marcado como cancelado.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              className={
                statusAction === "aprovado"
                  ? "bg-blue-600 text-white hover:bg-blue-600/90"
                  : "bg-destructive text-white hover:bg-destructive/90"
              }
            >
              {statusAction === "aprovado"
                ? "Aprovar"
                : "Cancelar Orçamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
