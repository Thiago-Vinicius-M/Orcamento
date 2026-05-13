import { describe, expect, it } from 'vitest'
import { createMockSupabaseClient } from '../../../tests/factories/supabase'
import { createSupabaseCrudRepository } from './createSupabaseCrudRepository'

type Widget = { id: string; nome: string }
type WidgetPayload = { nome: string }

describe('createSupabaseCrudRepository', () => {
  it('lista e mapeia linhas ordenando por nome (via cliente Supabase)', async () => {
    const supabase = createMockSupabaseClient({
      tables: {
        widgets: [
          { id: '2', nome: 'Beta', company_id: 'c1' },
          { id: '1', nome: 'Alfa', company_id: 'c1' },
        ],
      },
    })

    const repo = createSupabaseCrudRepository<Record<string, unknown>, Widget, WidgetPayload>(
      { supabase, companyResolver: async () => 'c1' },
      {
        table: 'widgets',
        select: 'id, nome',
        mapRow: (row) => ({ id: row.id as string, nome: (row.nome as string) ?? '' }),
        toInsert: (payload, ctx) => ({ nome: payload.nome, company_id: ctx.company_id }),
        toUpdate: (payload) => ({ nome: payload.nome }),
      },
    )

    const rows = await repo.list()
    expect(rows).toHaveLength(2)
    expect(rows[0]?.nome).toBe('Beta')
    expect(rows[1]?.nome).toBe('Alfa')
  })

  it('create inclui company_id e append na tabela mock', async () => {
    const supabase = createMockSupabaseClient({
      tables: {
        widgets: [],
      },
    })

    const repo = createSupabaseCrudRepository<Record<string, unknown>, Widget, WidgetPayload>(
      { supabase, companyResolver: async () => 'emp-x' },
      {
        table: 'widgets',
        select: 'id, nome',
        mapRow: (row) => ({ id: row.id as string, nome: (row.nome as string) ?? '' }),
        toInsert: (payload, ctx) => ({ nome: payload.nome, company_id: ctx.company_id }),
        toUpdate: (payload) => ({ nome: payload.nome }),
        emptyResultMessages: {
          create: 'fail create',
          update: 'fail update',
        },
      },
    )

    const created = await repo.create({ nome: 'Novo' })
    expect(created.nome).toBe('Novo')
    expect(created.id.length).toBeGreaterThan(0)

    const all = await repo.list()
    expect(all.some((w) => w.nome === 'Novo')).toBe(true)
  })

  it('update mescla pelo id', async () => {
    const supabase = createMockSupabaseClient({
      tables: {
        widgets: [{ id: 'a1', nome: 'Velho', company_id: 'c1' }],
      },
    })

    const repo = createSupabaseCrudRepository<Record<string, unknown>, Widget, WidgetPayload>(
      { supabase, companyResolver: async () => 'c1' },
      {
        table: 'widgets',
        select: 'id, nome',
        mapRow: (row) => ({ id: row.id as string, nome: (row.nome as string) ?? '' }),
        toInsert: (payload, ctx) => ({ nome: payload.nome, company_id: ctx.company_id }),
        toUpdate: (payload) => ({ nome: payload.nome }),
        emptyResultMessages: {
          create: 'fail create',
          update: 'fail update',
        },
      },
    )

    const updated = await repo.update('a1', { nome: 'Novo nome' })
    expect(updated.id).toBe('a1')
    expect(updated.nome).toBe('Novo nome')
  })

  it('remove exclui por id', async () => {
    const supabase = createMockSupabaseClient({
      tables: {
        widgets: [
          { id: 'k1', nome: 'X', company_id: 'c1' },
          { id: 'k2', nome: 'Y', company_id: 'c1' },
        ],
      },
    })

    const repo = createSupabaseCrudRepository<Record<string, unknown>, Widget, WidgetPayload>(
      { supabase, companyResolver: async () => 'c1' },
      {
        table: 'widgets',
        select: 'id, nome',
        mapRow: (row) => ({ id: row.id as string, nome: (row.nome as string) ?? '' }),
        toInsert: (payload, ctx) => ({ nome: payload.nome, company_id: ctx.company_id }),
        toUpdate: (payload) => ({ nome: payload.nome }),
        emptyResultMessages: {
          create: 'fail create',
          update: 'fail update',
        },
      },
    )

    await repo.remove('k1')

    const list = await repo.list()
    expect(list.map((r) => r.id).sort()).toEqual(['k2'])
  })
})
