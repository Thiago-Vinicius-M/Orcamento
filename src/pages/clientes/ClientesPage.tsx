import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
import { ConfirmDialog } from "@/components/ConfirmDialog"
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
import { useCrudPageState } from "@/hooks/useCrudPageState"
import { clienteService } from "@/services/clienteService"
import { formatCpfCnpj, formatPhone } from "@/lib/formatters"
import { ClienteForm } from "./ClienteForm"
import type { Cliente } from "@/types"
import type { ClienteFormData } from "@/schemas/cliente"

export function ClientesPage() {
  const {
    search,
    setSearch,
    formOpen,
    editing,
    deleting,
    setDeleting,
    isSubmitting,
    setSubmitting,
    openCreate,
    openEdit,
    closeForm,
  } = useCrudPageState<Cliente>()
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const clientes = useLiveQuery(async () => {
    if (search.trim()) {
      return clienteService.search(search.trim())
    }
    return clienteService.getAll()
  }, [search])

  async function handleSubmit(data: ClienteFormData) {
    setSubmitting(true)
    try {
      if (editing?.id) {
        await clienteService.update(editing.id, data)
        toast.success("Cliente atualizado com sucesso!")
      } else {
        await clienteService.create(data)
        toast.success("Cliente cadastrado com sucesso!")
      }
      closeForm()
    } catch {
      toast.error("Erro ao salvar cliente. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleting?.id) return
    try {
      await clienteService.remove(deleting.id)
      toast.success("Cliente excluído com sucesso!")
    } catch {
      toast.error("Erro ao excluir cliente. Tente novamente.")
    }
    setDeleting(undefined)
  }

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const isEmpty = clientes && clientes.length === 0
  const isSearchEmpty = isEmpty && search.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">
            Gerencie os clientes cadastrados.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CPF/CNPJ..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Desktop Table */}
      {clientes === undefined ? (
        <LoadingState />
      ) : isEmpty ? (
        <EmptyState
          icon={Users}
          title={isSearchEmpty ? "Nenhum resultado" : "Nenhum cliente cadastrado"}
          description={
            isSearchEmpty
              ? "Tente buscar com outros termos."
              : "Comece cadastrando seu primeiro cliente."
          }
          action={
            !isSearchEmpty ? (
              <Button onClick={openCreate}>
                <Plus />
                Novo Cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      {cliente.nome}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatCpfCnpj(cliente.cpfCnpj)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPhone(cliente.telefone)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cliente.email || "—"}
                    </TableCell>
                    <TableCell>
                      {cliente.cidade && cliente.estado
                        ? `${cliente.cidade}/${cliente.estado}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(cliente)}
                          title="Editar"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleting(cliente)}
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
            {clientes.map((cliente) => {
              const isExpanded = expandedId === cliente.id
              return (
                <div
                  key={cliente.id}
                  className="rounded-lg border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{cliente.nome}</p>
                      <Badge
                        variant="secondary"
                        className="mt-1 font-mono text-xs"
                      >
                        {formatCpfCnpj(cliente.cpfCnpj)}
                      </Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(cliente)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleting(cliente)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formatPhone(cliente.telefone)}
                    </span>
                    {cliente.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {cliente.email}
                      </span>
                    )}
                  </div>

                  {(cliente.cidade || cliente.logradouro) && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(cliente.id!)}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      {isExpanded ? "Ocultar endereço" : "Ver endereço"}
                    </button>
                  )}

                  {isExpanded && (
                    <div className="text-sm text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        {[
                          cliente.logradouro &&
                            `${cliente.logradouro}${cliente.numero ? `, ${cliente.numero}` : ""}`,
                          cliente.complemento,
                          cliente.bairro,
                          cliente.cidade &&
                            `${cliente.cidade}${cliente.estado ? `/${cliente.estado}` : ""}`,
                          cliente.cep,
                        ]
                          .filter(Boolean)
                          .join(" - ")}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground text-right">
            {clientes.length} cliente{clientes.length !== 1 && "s"}
          </p>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Altere os dados do cliente abaixo."
                : "Preencha os dados para cadastrar um novo cliente."}
            </DialogDescription>
          </DialogHeader>
          <ClienteForm
            key={editing?.id ?? "new"}
            cliente={editing}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Excluir cliente?"
        description={
          <>
            O cliente <strong>{deleting?.nome}</strong> será removido
            permanentemente. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        confirmClassName="bg-destructive text-white hover:bg-destructive/90"
        onConfirm={handleDelete}
      />
    </div>
  )
}
