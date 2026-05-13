import type { SupabaseClient } from '@supabase/supabase-js'

export type CrudOperation = 'list' | 'create' | 'update' | 'remove'

export interface CrudRepository<T, P> {
  list(): Promise<T[]>
  create(payload: P): Promise<T>
  update(id: string, payload: P): Promise<T>
  remove(id: string): Promise<void>
}

export interface SupabaseCrudDeps {
  supabase: SupabaseClient
  companyResolver: (supabase: SupabaseClient) => Promise<string>
}

export interface SupabaseCrudOptions<TRow, T, P> {
  table: string
  select: string
  mapRow: (row: TRow) => T
  toInsert: (payload: P, ctx: { company_id: string }) => Record<string, unknown>
  toUpdate: (payload: P) => Record<string, unknown>
  /** Reservado para escopo explícito por empresa (RLS cobre hoje). */
  scopeByCompany?: boolean
  /** Mensagens quando `error` vem vazio no create/update. */
  emptyResultMessages?: {
    create: string
    update: string
  }
  /**
   * Permite traduzir erros por operação (ex.: permissões em produtos).
   */
  translateError?: (err: unknown, op: CrudOperation) => Error
}

function throwMapped(
  err: unknown,
  op: CrudOperation,
  opts: SupabaseCrudOptions<unknown, unknown, unknown>,
): never {
  if (opts.translateError) {
    throw opts.translateError(err, op)
  }
  if (err && typeof err === 'object' && 'message' in err) {
    throw new Error(String((err as { message: unknown }).message))
  }
  throw new Error(typeof err === 'string' ? err : 'Erro desconhecido.')
}

export function createSupabaseCrudRepository<TRow, T, P>(
  deps: SupabaseCrudDeps,
  opts: SupabaseCrudOptions<TRow, T, P>,
): CrudRepository<T, P> {
  const { supabase, companyResolver } = deps

  return {
    async list(): Promise<T[]> {
      const { data, error } = await supabase
        .from(opts.table)
        .select(opts.select)
        .order('nome', { ascending: true })

      if (error) {
        throwMapped(error, 'list', opts as SupabaseCrudOptions<unknown, unknown, unknown>)
      }

      return (data ?? []).map((row) => opts.mapRow(row as TRow))
    },

    async create(payload: P): Promise<T> {
      const company_id = await companyResolver(supabase)
      const insertRow = opts.toInsert(payload, { company_id })

      const { data, error } = await supabase
        .from(opts.table)
        .insert(insertRow)
        .select(opts.select)
        .single()

      if (error || !data) {
        const synthetic =
          error ?? new Error(opts.emptyResultMessages?.create ?? 'Não foi possível criar o registro.')
        throwMapped(synthetic, 'create', opts as SupabaseCrudOptions<unknown, unknown, unknown>)
      }

      return opts.mapRow(data as TRow)
    },

    async update(id: string, payload: P): Promise<T> {
      const patch = opts.toUpdate(payload)

      const { data, error } = await supabase
        .from(opts.table)
        .update(patch)
        .eq('id', id)
        .select(opts.select)
        .single()

      if (error || !data) {
        const synthetic =
          error ?? new Error(opts.emptyResultMessages?.update ?? 'Não foi possível atualizar o registro.')
        throwMapped(synthetic, 'update', opts as SupabaseCrudOptions<unknown, unknown, unknown>)
      }

      return opts.mapRow(data as TRow)
    },

    async remove(id: string): Promise<void> {
      const { error } = await supabase.from(opts.table).delete().eq('id', id)

      if (error) {
        throwMapped(error, 'remove', opts as SupabaseCrudOptions<unknown, unknown, unknown>)
      }
    },
  }
}

/** Repositório que inicializa sob demanda (evita ler Supabase antes da configuração). */
export function createLazyCrudRepository<T, P>(init: () => CrudRepository<T, P>): CrudRepository<T, P> {
  let cached: CrudRepository<T, P> | null = null
  const resolve = () => {
    cached ??= init()
    return cached
  }

  return {
    list: () => resolve().list(),
    create: (payload: P) => resolve().create(payload),
    update: (id: string, payload: P) => resolve().update(id, payload),
    remove: (id: string) => resolve().remove(id),
  }
}
