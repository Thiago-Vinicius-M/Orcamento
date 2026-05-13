import { useCallback, useEffect, useRef, useState } from 'react'
import type { CrudRepository } from '../repositories/base/createSupabaseCrudRepository'

export type CrudResourceOptions<T extends { id: string }> = {
  /** Se retornar false, não chama `repo.list()` e usa `notConfiguredMessage`. */
  isConfigured?: () => boolean
  notConfiguredMessage?: string
  loadErrorFallback?: string
  sortItems?: (a: T, b: T) => number
}

export function useCrudResource<T extends { id: string }, P>(
  repo: CrudRepository<T, P>,
  options?: CrudResourceOptions<T>,
) {
  const optsRef = useRef(options)
  optsRef.current = options

  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mergeSorted = useCallback((updater: (prev: T[]) => T[]) => {
    setItems((prev) => {
      const next = updater(prev)
      const sort = optsRef.current?.sortItems
      return sort ? [...next].sort(sort) : next
    })
  }, [])

  const reload = useCallback(async () => {
    const o = optsRef.current

    setLoading(true)
    setError(null)

    if (o?.isConfigured && !o.isConfigured()) {
      setError(o.notConfiguredMessage ?? null)
      setLoading(false)
      return
    }

    try {
      const data = await repo.list()
      const sort = o?.sortItems
      setItems(sort ? [...data].sort(sort) : data)
    } catch (e) {
      setError(e instanceof Error ? e.message : (o?.loadErrorFallback ?? 'Erro ao carregar.'))
    }

    setLoading(false)
  }, [repo])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [reload])

  const create = useCallback(
    async (payload: P) => {
      setSaving(true)
      setError(null)
      try {
        const created = await repo.create(payload)
        mergeSorted((prev) => [...prev, created])
        return created
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao criar.'
        setError(msg)
        throw e
      } finally {
        setSaving(false)
      }
    },
    [repo, mergeSorted],
  )

  const update = useCallback(
    async (id: string, payload: P) => {
      setSaving(true)
      setError(null)
      try {
        const updated = await repo.update(id, payload)
        mergeSorted((prev) => prev.map((item) => (item.id === id ? updated : item)))
        return updated
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao atualizar.'
        setError(msg)
        throw e
      } finally {
        setSaving(false)
      }
    },
    [repo, mergeSorted],
  )

  const remove = useCallback(
    async (id: string) => {
      setSaving(true)
      setError(null)
      try {
        await repo.remove(id)
        mergeSorted((prev) => prev.filter((item) => item.id !== id))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao excluir.'
        setError(msg)
        throw e
      } finally {
        setSaving(false)
      }
    },
    [repo, mergeSorted],
  )

  return {
    items,
    loading,
    saving,
    error,
    setError,
    reload,
    create,
    update,
    remove,
  }
}
