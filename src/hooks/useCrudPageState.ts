import { useState, useCallback } from "react"

/**
 * Generic hook that encapsulates the shared CRUD page state and handlers
 * used by list+form+confirm-dialog pages (e.g. ClientesPage, ProdutosPage).
 *
 * @template T - Entity type with optional id (e.g. Cliente, Produto)
 */
export function useCrudPageState<T extends { id?: number }>() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<T | undefined>()
  const [deleting, setDeleting] = useState<T | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openCreate = useCallback(() => {
    setEditing(undefined)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((item: T) => {
    setEditing(item)
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditing(undefined)
  }, [])

  return {
    search,
    setSearch,
    formOpen,
    editing,
    deleting,
    setDeleting,
    isSubmitting,
    setSubmitting: setIsSubmitting,
    openCreate,
    openEdit,
    closeForm,
  }
}
