import { useNavigate, Link } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import {
  Plus,
  FileText,
  Users,
  Package,
  Eye,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Calendar,
} from "lucide-react"
import { LoadingState } from "@/components/LoadingState"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { db } from "@/db"
import { dashboardService } from "@/services/dashboardService"
import { formatCurrency, formatDate, formatNumeroOrcamento } from "@/lib/formatters"
import { STATUS_STYLES, STATUS_CONFIG, STATUS_ORCAMENTO_LABELS } from "@/lib/constants"
import type { StatusOrcamento } from "@/types"

export function Dashboard() {
  const navigate = useNavigate()

  const clienteCount = useLiveQuery(() => db.clientes.count())
  const produtoCount = useLiveQuery(() => db.produtos.count())
  const dashboardStats = useLiveQuery(() =>
    dashboardService.getStats(),
  )

  const statusEntries: StatusOrcamento[] = [
    "vigente",
    "expirado",
    "aprovado",
    "cancelado",
  ]
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral do sistema de orçamentos.
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

      {/* Status Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statusEntries.map((status) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const count = dashboardStats?.[status] ?? 0

          return (
            <Link
              key={status}
              to={`/orcamentos?status=${status}`}
              className="group rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-2 ${config.bg}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <span
                  className={`text-2xl font-bold tabular-nums ${config.color}`}
                >
                  {count}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">
                {STATUS_ORCAMENTO_LABELS[status]}
              </p>
            </Link>
          )
        })}
      </div>

      {/* Financial Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Total em Vigentes
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(dashboardStats?.valorVigentes ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Total Aprovados
          </div>
          <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(dashboardStats?.valorAprovados ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Valor Total Geral
          </div>
          <p className="mt-1 text-xl font-bold">
            {formatCurrency(dashboardStats?.valorTotal ?? 0)}
          </p>
        </div>
      </div>

      <Separator />

      {/* Recent Quotes + Quick Access */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Quotes */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Orçamentos Recentes</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/orcamentos")}
            >
              Ver todos
              <ArrowRight />
            </Button>
          </div>

          {dashboardStats === undefined ? (
            <LoadingState />
          ) : dashboardStats.recentes.length === 0 ? (
            <EmptyState
              icon={FileText}
              description="Nenhum orçamento cadastrado ainda."
              action={
                <Button
                  onClick={() => navigate("/orcamentos/novo")}
                  size="sm"
                >
                  <Plus />
                  Criar Primeiro Orçamento
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {dashboardStats.recentes.map((orc) => (
                <div
                  key={orc.id}
                  className={`group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 cursor-pointer ${
                    orc.status === "cancelado" ? "opacity-60" : ""
                  }`}
                  onClick={() => navigate(`/orcamentos/${orc.id}`)}
                >
                  <div
                    className={`hidden sm:flex shrink-0 rounded-lg p-2 ${STATUS_CONFIG[orc.status].bg}`}
                  >
                    {(() => {
                      const Icon = STATUS_CONFIG[orc.status].icon
                      return (
                        <Icon
                          className={`h-4 w-4 ${STATUS_CONFIG[orc.status].color}`}
                        />
                      )
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs shrink-0"
                      >
                        {formatNumeroOrcamento(orc.numero)}
                      </Badge>
                      <span className="font-medium truncate">
                        {orc.clienteNome}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(new Date(orc.dataEmissao))}
                      <Badge
                        variant={
                          orc.status === "cancelado" ? "outline" : "default"
                        }
                        className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[orc.status]}`}
                      >
                        {STATUS_ORCAMENTO_LABELS[orc.status]}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{formatCurrency(orc.total)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/orcamentos/${orc.id}`)
                    }}
                  >
                    <Eye />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Access Sidebar */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Acesso Rápido</h3>

          <Link
            to="/orcamentos/novo"
            className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent/50"
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Novo Orçamento</p>
              <p className="text-xs text-muted-foreground">
                Criar orçamento
              </p>
            </div>
          </Link>

          <Link
            to="/orcamentos"
            className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent/50"
          >
            <div className="rounded-lg bg-blue-500/10 p-2">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Orçamentos</p>
              <p className="text-xs text-muted-foreground">
                {dashboardStats?.total ?? 0} cadastrado
                {(dashboardStats?.total ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </Link>

          <Link
            to="/clientes"
            className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent/50"
          >
            <div className="rounded-lg bg-green-500/10 p-2">
              <Users className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Clientes</p>
              <p className="text-xs text-muted-foreground">
                {clienteCount ?? 0} cadastrado
                {(clienteCount ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </Link>

          <Link
            to="/produtos"
            className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent/50"
          >
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Package className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Produtos</p>
              <p className="text-xs text-muted-foreground">
                {produtoCount ?? 0} cadastrado
                {(produtoCount ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
