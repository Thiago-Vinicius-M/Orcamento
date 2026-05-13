import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session, User } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

export type FunctionsInvokeArgs = { body?: Record<string, unknown> | undefined }

export type CreateMockSupabaseClientOptions = {
  /** Sessão retornada por `auth.getSession`. */
  session?: Session | null
  /** Valor de `rpc('current_company_id')`. */
  companyId?: string | null
  /** Linhas por tabela (cópia interna; mutações refletem nos próximos selects). */
  tables?: Record<string, Record<string, unknown>[]>
  /** Substituir `functions.invoke`. */
  onInvoke?: (
    name: string,
    args: FunctionsInvokeArgs,
  ) => Promise<{ data: unknown; error: Error | null }> | { data: unknown; error: Error | null }
}

function cloneTables(source: Record<string, Record<string, unknown>[]>) {
  return structuredClone(source) as Record<string, Record<string, unknown>[]>
}

function makeMinimalUser(id: string): User {
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'mock@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: '2024-01-01T00:00:00.000Z',
  } as User
}

export function createMockSession(userId = 'user-mock'): Session {
  const user = makeMinimalUser(userId)
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  } as Session
}

/**
 * Cliente Supabase mínimo para testes unitários (auth, rpc, from CRUD simplificado, functions.invoke).
 */
export function createMockSupabaseClient(
  options: CreateMockSupabaseClientOptions = {},
): SupabaseClient {
  const state = {
    tables: cloneTables(options.tables ?? {}),
    companyId: options.companyId === undefined ? 'mock-company-id' : options.companyId,
  }

  function from(table: string) {
    if (!state.tables[table]) {
      state.tables[table] = []
    }
    const rows = state.tables[table]

    return {
      select(_columns?: string) {
        const chain = {
          order(_opts?: unknown) {
            return Promise.resolve({ data: [...rows], error: null })
          },
          eq(_col: string, _val: unknown) {
            return Promise.resolve({ data: null, error: null })
          },
          single() {
            return Promise.resolve({ data: rows[0] ?? null, error: null })
          },
          maybeSingle() {
            return Promise.resolve({ data: rows[0] ?? null, error: null })
          },
        }
        return chain
      },
      insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
        const toInsert = Array.isArray(payload) ? payload : [payload]
        return {
          select(_columns?: string) {
            return {
              single() {
                const row = { ...toInsert[0] }
                const id =
                  typeof row.id === 'string' && row.id.length > 0
                    ? row.id
                    : `gen-${randomUUID()}`
                const inserted = { ...row, id }
                rows.push(inserted)
                return Promise.resolve({ data: inserted, error: null })
              },
            }
          },
        }
      },
      update(patch: Record<string, unknown>) {
        return {
          eq(column: string, value: unknown) {
            return {
              select(_columns?: string) {
                return {
                  single() {
                    const idx = rows.findIndex((r) => r[column] === value)
                    if (idx < 0) {
                      return Promise.resolve({
                        data: null,
                        error: new Error('not found'),
                      })
                    }
                    rows[idx] = { ...rows[idx], ...patch }
                    return Promise.resolve({ data: rows[idx], error: null })
                  },
                }
              },
            }
          },
        }
      },
      delete() {
        return {
          eq(column: string, value: unknown) {
            const next = rows.filter((r) => r[column] !== value)
            state.tables[table] = next
            return Promise.resolve({ data: null, error: null })
          },
        }
      },
    }
  }

  return {
    from,
    auth: {
      getSession: async () => ({
        data: { session: options.session ?? null },
        error: null,
      }),
      getUser: async () => ({
        data: {
          user: options.session?.user ?? null,
        },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
    },
    rpc: async (fn: string) => {
      if (fn === 'current_company_id') {
        return { data: state.companyId, error: null }
      }
      if (fn === 'ensure_gerente_profile') {
        return { data: state.companyId, error: null }
      }
      return { data: null, error: new Error(`rpc não mockado: ${fn}`) }
    },
    functions: {
      invoke: async (name: string, args: FunctionsInvokeArgs) => {
        if (options.onInvoke) {
          return options.onInvoke(name, args)
        }
        return { data: null, error: null }
      },
    },
  } as unknown as SupabaseClient
}
