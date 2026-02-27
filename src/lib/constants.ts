import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import type { StatusOrcamento, FormaPagamento } from "@/types"

export const STATUS_STYLES: Record<StatusOrcamento, string> = {
  vigente:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  expirado:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  aprovado:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cancelado: "text-muted-foreground",
}

export const STATUS_CONFIG: Record<
  StatusOrcamento,
  { icon: typeof Clock; color: string; bg: string }
> = {
  vigente: {
    icon: Clock,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  expirado: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  aprovado: {
    icon: CheckCircle2,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  cancelado: {
    icon: XCircle,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
}

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "financiamento", label: "Financiamento" },
]

export const FORMA_PAGAMENTO_LABELS: Record<string, string> =
  Object.fromEntries(FORMAS_PAGAMENTO.map(({ value, label }) => [value, label]))

export const STATUS_ORCAMENTO_LABELS: Record<StatusOrcamento, string> = {
  vigente: "Vigente",
  expirado: "Expirado",
  aprovado: "Aprovado",
  cancelado: "Cancelado",
}

export type StatusFilter = "todos" | StatusOrcamento

export const VALID_STATUS: StatusOrcamento[] = [
  "vigente",
  "expirado",
  "aprovado",
  "cancelado",
]
