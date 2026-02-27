import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Copy,
  FileText,
  Trash2,
  Calendar,
  FileDown,
  X,
} from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import type { OrcamentoListItem } from "@/services/orcamentoService"
import { LoadingState } from "@/components/LoadingState"
import {
  formatCurrency,
  formatDate,
  formatNumeroOrcamento,
} from "@/lib/formatters"
import { STATUS_STYLES, STATUS_CONFIG, STATUS_ORCAMENTO_LABELS } from "@/lib/constants"
import { useOrcamentoActions } from "@/hooks/useOrcamentoActions"
import { useOrcamentoFilters } from "@/hooks/useOrcamentoFilters"

export function OrcamentosListPage() {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState<OrcamentoListItem | undefined>()
  const { duplicating, generatingPdfId, handleDuplicate, handleGeneratePdf, handleDelete } =
    useOrcamentoActions()

  const {
    search,
    setSearch,
    statusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    orcamentos,
    statusCounts,
    clearFilters,
    handleStatusFilterChange,
    isEmpty,
    hasFilters,
    VALID_STATUS,
  } = useOrcamentoFilters()

  async function onConfirmDelete() {
    if (!deleting?.id) return
    await handleDelete(deleting.id)
    setDeleting(undefined)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orçamentos</h2>
          <p className="text-muted-foreground">
            Gerencie todos os orçamentos.
          </p>
        </div>
        <Button
          onClick={() => navigate("/orcamentos/novo")}
          className="w-full sm:w-auto"
        >
          <Plus />
          Novo Orçamento
        </Button>
      </div>

      {/* Status Summary Tabs */}
      {statusCounts && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => handleStatusFilterChange("todos")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === "todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-accent"
            }`}
          >
            Todos
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${
                statusFilter === "todos"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {statusCounts.todos}
            </span>
          </button>
          {VALID_STATUS.map((status) => {
            const Icon = STATUS_CONFIG[status].icon
            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusFilterChange(status)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-accent"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    statusFilter === status
                      ? "text-primary-foreground"
                      : STATUS_CONFIG[status].color
                  }`}
                />
                {STATUS_ORCAMENTO_LABELS[status]}
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    statusFilter === status
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {statusCounts[status]}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou número..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              className="pl-10 w-full sm:w-[160px]"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="Data inicial"
            />
          </div>
          <span className="text-muted-foreground text-sm">até</span>
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              className="pl-10 w-full sm:w-[160px]"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Data final"
            />
          </div>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Content */}
      {orcamentos === undefined ? (
        <LoadingState />
      ) : isEmpty ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "Nenhum resultado" : "Nenhum orçamento cadastrado"}
          description={
            hasFilters
              ? "Tente buscar com outros termos ou altere os filtros."
              : "Comece criando seu primeiro orçamento."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                <X />
                Limpar Filtros
              </Button>
            ) : (
              <Button onClick={() => navigate("/orcamentos/novo")}>
                <Plus />
                Novo Orçamento
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[170px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamentos.map((orc) => (
                  <TableRow
                    key={orc.id}
                    className={
                      orc.status === "cancelado" ? "opacity-60" : undefined
                    }
                  >
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs"
                      >
                        {formatNumeroOrcamento(orc.numero)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {orc.clienteNome}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(new Date(orc.dataEmissao))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(new Date(orc.dataValidade))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(orc.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          orc.status === "cancelado" ? "outline" : "default"
                        }
                        className={STATUS_STYLES[orc.status]}
                      >
                        {STATUS_ORCAMENTO_LABELS[orc.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            navigate(`/orcamentos/${orc.id}`)
                          }
                          title="Visualizar"
                        >
                          <Eye />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            navigate(`/orcamentos/${orc.id}/editar`)
                          }
                          title="Editar"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDuplicate(orc.id!)}
                          disabled={duplicating}
                          title="Duplicar"
                        >
                          <Copy />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleGeneratePdf(orc.id!)}
                          disabled={generatingPdfId === orc.id}
                          title="Gerar PDF"
                        >
                          <FileDown />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleting(orc)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {orcamentos.map((orc) => (
              <div
                key={orc.id}
                className={`rounded-lg border bg-card p-4 space-y-3 cursor-pointer active:bg-accent/50 ${
                  orc.status === "cancelado" ? "opacity-60" : ""
                }`}
                onClick={() => navigate(`/orcamentos/${orc.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs"
                      >
                        {formatNumeroOrcamento(orc.numero)}
                      </Badge>
                      <Badge
                        variant={
                          orc.status === "cancelado" ? "outline" : "default"
                        }
                        className={STATUS_STYLES[orc.status]}
                      >
                        {STATUS_ORCAMENTO_LABELS[orc.status]}
                      </Badge>
                    </div>
                    <p className="mt-2 font-semibold truncate">
                      {orc.clienteNome}
                    </p>
                  </div>
                  <span className="font-bold text-lg shrink-0">
                    {formatCurrency(orc.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(new Date(orc.dataEmissao))}
                    </span>
                    <span>
                      Val: {formatDate(new Date(orc.dataValidade))}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGeneratePdf(orc.id!)
                      }}
                      disabled={generatingPdfId === orc.id}
                      title="Gerar PDF"
                    >
                      <FileDown />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {orcamentos.length} orçamento
              {orcamentos.length !== 1 && "s"}
              {hasFilters && " encontrado" + (orcamentos.length !== 1 ? "s" : "")}
            </span>
            <span className="font-medium">
              Total: {formatCurrency(orcamentos.reduce((s, o) => s + o.total, 0))}
            </span>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Excluir orçamento?"
        description={
          <>
            O orçamento{" "}
            <strong>
              {deleting && formatNumeroOrcamento(deleting.numero)}
            </strong>{" "}
            de <strong>{deleting?.clienteNome}</strong> será removido
            permanentemente. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        confirmClassName="bg-destructive text-white hover:bg-destructive/90"
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
