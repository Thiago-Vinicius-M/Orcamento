import { useState, useCallback } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  Search,
  Plus,
  Pencil,
  Package,
  Power,
  PowerOff,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { LoadingState } from "@/components/LoadingState"
import { produtoService } from "@/services/produtoService"
import { formatCurrency } from "@/lib/formatters"
import { ProdutoForm } from "./ProdutoForm"
import type { Produto } from "@/types"
import type { ProdutoFormData } from "@/schemas/produto"

type StatusFilter = "todos" | "ativo" | "inativo"

export function ProdutosPage() {
  const [search, setSearch] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState("todas")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Produto | undefined>()
  const [toggling, setToggling] = useState<Produto | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categorias = useLiveQuery(() => produtoService.getCategories())

  const produtos = useLiveQuery(async () => {
    let results: Produto[]

    if (search.trim()) {
      const cat = categoriaFilter !== "todas" ? categoriaFilter : undefined
      results = await produtoService.search(search.trim(), cat)
    } else if (categoriaFilter !== "todas") {
      results = await produtoService.getByCategory(categoriaFilter)
    } else {
      results = await produtoService.getAll()
    }

    if (statusFilter === "ativo") {
      return results.filter((p) => p.ativo)
    }
    if (statusFilter === "inativo") {
      return results.filter((p) => !p.ativo)
    }
    return results
  }, [search, categoriaFilter, statusFilter])

  const openCreate = useCallback(() => {
    setEditing(undefined)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((produto: Produto) => {
    setEditing(produto)
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditing(undefined)
  }, [])

  async function handleSubmit(data: ProdutoFormData) {
    setIsSubmitting(true)
    try {
      if (editing?.id) {
        await produtoService.update(editing.id, data)
        toast.success("Produto atualizado com sucesso!")
      } else {
        await produtoService.create(data)
        toast.success("Produto cadastrado com sucesso!")
      }
      closeForm()
    } catch {
      toast.error("Erro ao salvar produto. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleActive() {
    if (!toggling?.id) return
    try {
      await produtoService.toggleActive(toggling.id)
      toast.success(
        toggling.ativo ? "Produto desativado." : "Produto reativado.",
      )
    } catch {
      toast.error("Erro ao alterar status do produto.")
    }
    setToggling(undefined)
  }

  const isEmpty = produtos && produtos.length === 0
  const hasFilters =
    search.trim().length > 0 ||
    categoriaFilter !== "todas" ||
    statusFilter !== "todos"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtos</h2>
          <p className="text-muted-foreground">
            Gerencie os produtos do catálogo.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus />
          Novo Produto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código/SKU..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias?.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {produtos === undefined ? (
        <LoadingState />
      ) : isEmpty ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">
            {hasFilters ? "Nenhum resultado" : "Nenhum produto cadastrado"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? "Tente buscar com outros termos ou altere os filtros."
              : "Comece cadastrando seu primeiro produto."}
          </p>
          {!hasFilters && (
            <Button onClick={openCreate} className="mt-4">
              <Plus />
              Novo Produto
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow
                    key={produto.id}
                    className={!produto.ativo ? "opacity-60" : undefined}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{produto.nome}</p>
                        {produto.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {produto.descricao}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {produto.codigoSku}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {produto.categoria}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(produto.preco)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={produto.ativo ? "default" : "outline"}
                        className={
                          produto.ativo
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }
                      >
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(produto)}
                          title="Editar"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setToggling(produto)}
                          title={produto.ativo ? "Desativar" : "Ativar"}
                          className={
                            produto.ativo
                              ? "text-amber-600 hover:text-amber-600"
                              : "text-emerald-600 hover:text-emerald-600"
                          }
                        >
                          {produto.ativo ? <PowerOff /> : <Power />}
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
            {produtos.map((produto) => (
              <div
                key={produto.id}
                className={`rounded-lg border bg-card p-4 space-y-3 ${
                  !produto.ativo ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{produto.nome}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs"
                      >
                        {produto.codigoSku}
                      </Badge>
                      <Badge
                        variant={produto.ativo ? "default" : "outline"}
                        className={
                          produto.ativo
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }
                      >
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEdit(produto)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setToggling(produto)}
                      className={
                        produto.ativo
                          ? "text-amber-600 hover:text-amber-600"
                          : "text-emerald-600 hover:text-emerald-600"
                      }
                    >
                      {produto.ativo ? <PowerOff /> : <Power />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    {produto.categoria}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(produto.preco)}
                  </span>
                </div>

                {produto.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {produto.descricao}
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-right">
            {produtos.length} produto{produtos.length !== 1 && "s"}
          </p>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Altere os dados do produto abaixo."
                : "Preencha os dados para cadastrar um novo produto."}
            </DialogDescription>
          </DialogHeader>
          <ProdutoForm
            key={editing?.id ?? "new"}
            produto={editing}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            isSubmitting={isSubmitting}
            categoriasExistentes={categorias}
          />
        </DialogContent>
      </Dialog>

      {/* Toggle Active Confirmation */}
      <AlertDialog
        open={!!toggling}
        onOpenChange={(open) => !open && setToggling(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggling?.ativo ? "Desativar produto?" : "Reativar produto?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggling?.ativo ? (
                <>
                  O produto <strong>{toggling?.nome}</strong> será marcado como
                  inativo e não aparecerá na seleção de novos orçamentos.
                </>
              ) : (
                <>
                  O produto <strong>{toggling?.nome}</strong> será reativado e
                  ficará disponível para novos orçamentos.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={
                toggling?.ativo
                  ? "bg-amber-600 text-white hover:bg-amber-600/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-600/90"
              }
            >
              {toggling?.ativo ? "Desativar" : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
