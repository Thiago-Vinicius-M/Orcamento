import { describe, it, expect } from 'vitest'
import {
  createMockSupabaseClient,
  createMockSession,
} from '../../../../tests/factories/supabase'

describe('cadastro gerente (cliente Supabase fake)', () => {
  it('functions.invoke register-gerente pode ser mockado', async () => {
    const client = createMockSupabaseClient({
      onInvoke: async (name, args) => {
        expect(name).toBe('register-gerente')
        expect(args.body?.email).toBe('novo@empresa.example')
        return { data: { ok: true, loginCode: 'MOCK-001' }, error: null }
      },
    })

    const { data, error } = await client.functions.invoke('register-gerente', {
      body: {
        razaoSocial: 'ACME',
        cnpj: '00.000.000/0001-00',
        username: 'admin',
        email: 'novo@empresa.example',
        password: 'secret',
        emailRedirectTo: 'https://app.example/auth/confirm-callback',
      },
    })

    expect(error).toBeNull()
    expect(data).toEqual({ ok: true, loginCode: 'MOCK-001' })
  })

  it('auth.getSession reflete sessão configurada', async () => {
    const session = createMockSession('user-abc')
    const client = createMockSupabaseClient({ session })

    const { data, error } = await client.auth.getSession()
    expect(error).toBeNull()
    expect(data.session?.user.id).toBe('user-abc')
  })
})
