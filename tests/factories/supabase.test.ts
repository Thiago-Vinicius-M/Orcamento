import { describe, it, expect } from 'vitest'
import { createMockSupabaseClient } from './supabase'

describe('createMockSupabaseClient', () => {
  it('select + order devolve linhas da tabela', async () => {
    const client = createMockSupabaseClient({
      tables: {
        clientes: [{ id: 'c1', nome: 'Alpha', company_id: 'co' }],
      },
    })

    const { data, error } = await client.from('clientes').select('id, nome').order('nome')
    expect(error).toBeNull()
    expect(data).toEqual([{ id: 'c1', nome: 'Alpha', company_id: 'co' }])
  })

  it('rpc current_company_id usa companyId da opção', async () => {
    const client = createMockSupabaseClient({ companyId: 'empresa-x' })
    const { data, error } = await client.rpc('current_company_id')
    expect(error).toBeNull()
    expect(data).toBe('empresa-x')
  })
})
