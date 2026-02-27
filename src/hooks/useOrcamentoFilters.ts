import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { orcamentoService, type OrcamentoListItem } from "@/services/orcamentoService"
import type { StatusOrcamento } from "@/types"
import { VALID_STATUS, type StatusFilter } from "@/lib/constants"

export type { StatusFilter }

export interface UseOrcamentoFiltersResult {
  search: string
  setSearch: (v: string) => void
  statusFilter: StatusFilter
  setStatusFilter: (v: StatusFilter) => void
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  orcamentos: OrcamentoListItem[] | undefined
  statusCounts: Record<string, number> | undefined
  clearFilters: () => void
  handleStatusFilterChange: (v: StatusFilter) => void
  isEmpty: boolean
  hasFilters: boolean
  VALID_STATUS: readonly StatusOrcamento[]
}

export function useOrcamentoFilters(): UseOrcamentoFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialStatus = searchParams.get("status")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialStatus && VALID_STATUS.includes(initialStatus as StatusOrcamento)
      ? (initialStatus as StatusOrcamento)
      : "todos",
  )
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    const s = searchParams.get("status")
    if (s && VALID_STATUS.includes(s as StatusOrcamento)) {
      setStatusFilter(s as StatusOrcamento)
    }
  }, [searchParams])

  function handleStatusFilterChange(v: StatusFilter) {
    setStatusFilter(v)
    if (v === "todos") {
      searchParams.delete("status")
    } else {
      searchParams.set("status", v)
    }
    setSearchParams(searchParams, { replace: true })
  }

  const orcamentos = useLiveQuery(async () => {
    const all = await orcamentoService.getAll()
    let filtered = all

    if (search.trim()) {
      const lower = search.toLowerCase()
      filtered = filtered.filter(
        (o) =>
          o.clienteNome.toLowerCase().includes(lower) ||
          String(o.numero).includes(search.trim()),
      )
    }

    if (statusFilter !== "todos") {
      filtered = filtered.filter((o) => o.status === statusFilter)
    }

    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00")
      filtered = filtered.filter(
        (o) => new Date(o.dataEmissao) >= from,
      )
    }

    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59")
      filtered = filtered.filter(
        (o) => new Date(o.dataEmissao) <= to,
      )
    }

    return filtered
  }, [search, statusFilter, dateFrom, dateTo])

  const statusCounts = useLiveQuery(async () => {
    const all = await orcamentoService.getAll()
    const counts: Record<string, number> = {
      todos: all.length,
      vigente: 0,
      expirado: 0,
      aprovado: 0,
      cancelado: 0,
    }
    for (const o of all) counts[o.status]++
    return counts
  })

  function clearFilters() {
    setSearch("")
    setStatusFilter("todos")
    setDateFrom("")
    setDateTo("")
    searchParams.delete("status")
    setSearchParams(searchParams, { replace: true })
  }

  const isEmpty = orcamentos !== undefined && orcamentos.length === 0
  const hasFilters =
    search.trim().length > 0 ||
    statusFilter !== "todos" ||
    dateFrom !== "" ||
    dateTo !== ""

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
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
  }
}
