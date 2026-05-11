import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient } from '@supabase/supabase-js'

type CheckResult = {
  id: string
  description: string
  ok: boolean
  detail?: string
}

function loadDotEnvFallback() {
  const envPath = resolve(process.cwd(), '.env')
  let contents = ''

  try {
    contents = readFileSync(envPath, 'utf8')
  } catch {
    return
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

async function invokeFunction(
  supabaseUrl: string,
  anonKey: string,
  functionName: string,
  body: unknown,
  accessToken?: string,
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { status: response.status, json }
}

async function main() {
  loadDotEnvFallback()

  const supabaseUrl = requiredEnv('SUPABASE_URL')
  const anonKey = requiredEnv('SUPABASE_ANON_KEY')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const runId = randomUUID().slice(0, 8)
  const loginCodeA = `T${runId.toUpperCase()}A`
  const loginCodeB = `T${runId.toUpperCase()}B`

  const gerenteEmailA = `gerente.a.${runId}@example.com`
  const gerenteEmailB = `gerente.b.${runId}@example.com`
  const gerentePassword = `Gerente#${runId}123`
  const vendedorPassword = `Vendedor#${runId}123`
  const vendedorUsername = `seller_${runId}`

  const createdUserIds: string[] = []
  const createdCompanyIds: string[] = []
  const checks: CheckResult[] = []

  try {
    const { data: companyA, error: companyAError } = await admin
      .from('companies')
      .insert({ razao_social: `Empresa Teste A ${runId}`, login_code: loginCodeA })
      .select('id, login_code')
      .single()
    if (companyAError) throw companyAError

    const { data: companyB, error: companyBError } = await admin
      .from('companies')
      .insert({ razao_social: `Empresa Teste B ${runId}`, login_code: loginCodeB })
      .select('id, login_code')
      .single()
    if (companyBError) throw companyBError

    createdCompanyIds.push(companyA.id, companyB.id)

    const { data: gerenteA, error: gerenteAError } = await admin.auth.admin.createUser({
      email: gerenteEmailA,
      password: gerentePassword,
      email_confirm: true,
      user_metadata: { role: 'vendedor', nome: `Gerente A ${runId}` },
    })
    if (gerenteAError || !gerenteA.user) {
      throw new Error(`Falha ao criar gerente A: ${JSON.stringify(gerenteAError)}`)
    }

    const { data: gerenteB, error: gerenteBError } = await admin.auth.admin.createUser({
      email: gerenteEmailB,
      password: gerentePassword,
      email_confirm: true,
      user_metadata: { role: 'vendedor', nome: `Gerente B ${runId}` },
    })
    if (gerenteBError || !gerenteB.user) {
      throw new Error(`Falha ao criar gerente B: ${JSON.stringify(gerenteBError)}`)
    }

    createdUserIds.push(gerenteA.user.id, gerenteB.user.id)

    const { error: profileInsertError } = await admin.from('profiles').insert([
      { user_id: gerenteA.user.id, company_id: companyA.id, role: 'gerente', nome: `Gerente A ${runId}` },
      { user_id: gerenteB.user.id, company_id: companyB.id, role: 'gerente', nome: `Gerente B ${runId}` },
    ])
    if (profileInsertError) throw profileInsertError

    const gerenteSignIn = await publicClient.auth.signInWithPassword({
      email: gerenteEmailA,
      password: gerentePassword,
    })
    ensure(!gerenteSignIn.error, `Falha no login de gerente: ${gerenteSignIn.error?.message}`)
    ensure(gerenteSignIn.data.session, 'Sessao de gerente nao retornada')

    checks.push({
      id: 'accept-gerente-login-email-senha',
      description: 'Login de gerente funciona com email + senha',
      ok: true,
    })

    const createPayload = {
      nome: `Vendedor ${runId}`,
      username: vendedorUsername,
      password: vendedorPassword,
      company_id: companyB.id,
    }

    const { data: jwtUser, error: jwtError } = await admin.auth.getUser(
      gerenteSignIn.data.session.access_token,
    )
    ensure(!jwtError && !!jwtUser.user, `JWT de gerente invalido: ${jwtError?.message ?? 'sem usuario'}`)

    const createResponse = await invokeFunction(
      supabaseUrl,
      anonKey,
      'create-vendedor',
      createPayload,
      gerenteSignIn.data.session.access_token,
    )
    if (createResponse.status !== 200) {
      const errBody = createResponse.json as { error?: string; error_code?: string; message?: string }
      const detail = errBody.message ?? errBody.error ?? errBody.error_code ?? JSON.stringify(createResponse.json)
      throw new Error(`create-vendedor falhou (${createResponse.status}): ${detail}`)
    }

    const { data: credential, error: credentialError } = await admin
      .from('vendedor_credentials')
      .select('auth_user_id, company_id, username')
      .eq('username', vendedorUsername)
      .single()
    if (credentialError) throw credentialError

    ensure(credential.company_id === companyA.id, 'Vendedor nao herdou company_id do gerente autenticado')
    checks.push({
      id: 'scenario-gerente-cria-vendedor-mesma-empresa',
      description: 'Gerente cria vendedor na propria empresa',
      ok: true,
    })
    checks.push({
      id: 'scenario-gerente-nao-cria-vendedor-fora-empresa',
      description: 'Gerente nao cria vendedor fora da empresa (payload externo ignorado)',
      ok: true,
    })

    if (credential.auth_user_id) {
      createdUserIds.push(credential.auth_user_id)
    }

    const loginSuccess = await invokeFunction(supabaseUrl, anonKey, 'login-vendedor', {
      company_code: loginCodeA,
      username: vendedorUsername,
      password: vendedorPassword,
    })
    ensure(loginSuccess.status === 200, `login-vendedor sucesso falhou: ${JSON.stringify(loginSuccess)}`)
    ensure(loginSuccess.json.user && typeof loginSuccess.json.user === 'object', 'user ausente no login-vendedor')
    ensure(
      (loginSuccess.json.user as Record<string, unknown>).role === 'vendedor',
      'role incorreta no login-vendedor',
    )
    ensure(
      (loginSuccess.json.user as Record<string, unknown>).company_id === companyA.id,
      'company_id incorreto no login-vendedor',
    )
    checks.push({
      id: 'scenario-vendedor-login-sucesso',
      description: 'Vendedor loga com credenciais validas',
      ok: true,
    })

    const wrongCodeLogin = await invokeFunction(supabaseUrl, anonKey, 'login-vendedor', {
      company_code: loginCodeB,
      username: vendedorUsername,
      password: vendedorPassword,
    })
    ensure(wrongCodeLogin.status === 401, `Codigo de empresa errado deveria falhar com 401: ${JSON.stringify(wrongCodeLogin)}`)
    ensure(
      wrongCodeLogin.json.error_code === 'INVALID_CREDENTIALS',
      'error_code esperado INVALID_CREDENTIALS para codigo errado',
    )
    checks.push({
      id: 'scenario-vendedor-codigo-errado-falha',
      description: 'Vendedor com codigo errado falha',
      ok: true,
    })

    const unknownCompanyLogin = await invokeFunction(supabaseUrl, anonKey, 'login-vendedor', {
      company_code: `NOPE_${runId}`,
      username: vendedorUsername,
      password: vendedorPassword,
    })
    ensure(
      unknownCompanyLogin.status === 401,
      `Empresa inexistente deve retornar 401 (anti-enum): ${JSON.stringify(unknownCompanyLogin)}`,
    )
    ensure(
      unknownCompanyLogin.json.error_code === 'INVALID_CREDENTIALS',
      'error_code esperado INVALID_CREDENTIALS para empresa inexistente',
    )
    checks.push({
      id: 'scenario-vendedor-empresa-inexistente-anti-enum',
      description: 'Codigo de empresa inexistente nao distingue 404 (anti-enumeracao)',
      ok: true,
    })

    const wrongPasswordLogin = await invokeFunction(supabaseUrl, anonKey, 'login-vendedor', {
      company_code: loginCodeA,
      username: vendedorUsername,
      password: `${vendedorPassword}_INVALIDA`,
    })
    ensure(
      wrongPasswordLogin.status === 401,
      `Senha invalida deveria falhar com 401: ${JSON.stringify(wrongPasswordLogin)}`,
    )
    ensure(
      wrongPasswordLogin.json.error_code === 'INVALID_CREDENTIALS',
      'error_code esperado INVALID_CREDENTIALS para senha invalida',
    )
    checks.push({
      id: 'scenario-vendedor-usuario-senha-invalido-falha',
      description: 'Vendedor com usuario/senha invalidos falha',
      ok: true,
    })

    const resolveDeprecated = await invokeFunction(supabaseUrl, anonKey, 'resolve-vendedor-email', {
      login_code: loginCodeA,
      username: vendedorUsername,
    })
    ensure(resolveDeprecated.status === 410, `resolve-vendedor-email deve retornar 410: ${JSON.stringify(resolveDeprecated)}`)
    ensure(
      (resolveDeprecated.json as { error_code?: string }).error_code === 'ENDPOINT_DEPRECATED',
      'error_code ENDPOINT_DEPRECATED no 410 de resolve-vendedor-email',
    )
    checks.push({
      id: 'scenario-resolve-vendedor-email-descontinuado',
      description: 'resolve-vendedor-email retorna 410 sem dados sensiveis',
      ok: true,
    })

    // ============================================================
    // Validacoes multi-tenant + RLS + numero_pdf (tenant-safe)
    // ============================================================

    const loginVendedorResp = loginSuccess.json as {
      access_token?: string
      refresh_token?: string
    }
    ensure(
      typeof loginVendedorResp.access_token === 'string' && loginVendedorResp.access_token.length > 0,
      'login-vendedor nao devolveu access_token',
    )
    ensure(
      typeof loginVendedorResp.refresh_token === 'string' && loginVendedorResp.refresh_token.length > 0,
      'login-vendedor nao devolveu refresh_token',
    )

    const vendedorAUserId = credential.auth_user_id
    ensure(!!vendedorAUserId, 'auth_user_id do vendedor A nao foi persistido')

    const gerenteBSignIn = await publicClient.auth.signInWithPassword({
      email: gerenteEmailB,
      password: gerentePassword,
    })
    ensure(!gerenteBSignIn.error, `Falha no login de gerente B: ${gerenteBSignIn.error?.message}`)
    ensure(gerenteBSignIn.data.session, 'Sessao de gerente B nao retornada')

    const { data: clienteA, error: clienteAError } = await admin
      .from('clientes')
      .insert({
        company_id: companyA.id,
        nome: `Cliente A ${runId}`,
        created_by: gerenteA.user.id,
      })
      .select('id')
      .single()
    if (clienteAError) throw clienteAError

    const { data: clienteB, error: clienteBError } = await admin
      .from('clientes')
      .insert({
        company_id: companyB.id,
        nome: `Cliente B ${runId}`,
        created_by: gerenteB.user.id,
      })
      .select('id')
      .single()
    if (clienteBError) throw clienteBError

    const buildSessionClient = (accessToken: string) =>
      createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      })

    const gerenteAToken = gerenteSignIn.data.session.access_token
    const gerenteBToken = gerenteBSignIn.data.session.access_token
    const vendedorAToken = loginVendedorResp.access_token

    const gerenteAClient = buildSessionClient(gerenteAToken)
    const gerenteBClient = buildSessionClient(gerenteBToken)
    const vendedorAClient = buildSessionClient(vendedorAToken)

    // RPCs usadas pelo frontend (useUserRole / companyContext) refletem perfil da sessao.
    const rpcRoleA = await gerenteAClient.rpc('current_role')
    const rpcCompanyA = await gerenteAClient.rpc('current_company_id')
    ensure(!rpcRoleA.error, `rpc current_role gerente A: ${rpcRoleA.error?.message}`)
    ensure(!rpcCompanyA.error, `rpc current_company_id gerente A: ${rpcCompanyA.error?.message}`)
    ensure(rpcRoleA.data === 'gerente', `current_role esperado 'gerente', recebido ${rpcRoleA.data}`)
    ensure(rpcCompanyA.data === companyA.id, 'current_company_id divergente para gerente A')

    const rpcRoleV = await vendedorAClient.rpc('current_role')
    const rpcCompanyV = await vendedorAClient.rpc('current_company_id')
    ensure(!rpcRoleV.error, `rpc current_role vendedor A: ${rpcRoleV.error?.message}`)
    ensure(!rpcCompanyV.error, `rpc current_company_id vendedor A: ${rpcCompanyV.error?.message}`)
    ensure(rpcRoleV.data === 'vendedor', `current_role esperado 'vendedor', recebido ${rpcRoleV.data}`)
    ensure(rpcCompanyV.data === companyA.id, 'current_company_id divergente para vendedor A')

    checks.push({
      id: 'rpc-current-role-company-refletem-sessao',
      description: 'RPCs current_role e current_company_id refletem o perfil da sessao',
      ok: true,
    })

    // Inserts via clientes autenticados exercitam o trigger orcamentos_set_numero_pdf_before_insert
    // (que delega para next_orcamento_numero_pdf -> next_orcamento_numero_pdf_for_company).
    const insertOrcamentoComoSessao = async (
      client: ReturnType<typeof buildSessionClient>,
      payload: { company_id: string; vendedor_id: string; cliente_id: string },
    ) => {
      const { data, error } = await client
        .from('orcamentos')
        .insert(payload)
        .select('id, numero_pdf, company_id, vendedor_id, created_by_user_id, created_by_name')
        .single()
      if (error) throw new Error(`Falha ao inserir orcamento como sessao: ${error.message}`)
      return data
    }

    const nomeGerenteA = `Gerente A ${runId}`
    const nomeGerenteB = `Gerente B ${runId}`
    const nomeVendedorA = createPayload.nome

    const assertCreatedByAposInsert = (
      label: string,
      row: {
        created_by_user_id: string | null
        created_by_name: string | null
      },
      expectedUserId: string,
      expectedNome: string,
    ) => {
      ensure(
        row.created_by_user_id === expectedUserId,
        `${label}: created_by_user_id esperado ${expectedUserId}, recebido ${JSON.stringify(row.created_by_user_id)}`,
      )
      ensure(
        row.created_by_name === expectedNome,
        `${label}: created_by_name esperado ${JSON.stringify(expectedNome)}, recebido ${JSON.stringify(row.created_by_name)}`,
      )
    }

    const orcGerA1 = await insertOrcamentoComoSessao(gerenteAClient, {
      company_id: companyA.id,
      vendedor_id: gerenteA.user.id,
      cliente_id: clienteA.id,
    })
    const orcGerA2 = await insertOrcamentoComoSessao(gerenteAClient, {
      company_id: companyA.id,
      vendedor_id: gerenteA.user.id,
      cliente_id: clienteA.id,
    })
    const orcVendA = await insertOrcamentoComoSessao(vendedorAClient, {
      company_id: companyA.id,
      vendedor_id: vendedorAUserId,
      cliente_id: clienteA.id,
    })
    const orcGerB = await insertOrcamentoComoSessao(gerenteBClient, {
      company_id: companyB.id,
      vendedor_id: gerenteB.user.id,
      cliente_id: clienteB.id,
    })

    assertCreatedByAposInsert('orcGerA1', orcGerA1, gerenteA.user.id, nomeGerenteA)
    assertCreatedByAposInsert('orcGerA2', orcGerA2, gerenteA.user.id, nomeGerenteA)
    assertCreatedByAposInsert('orcVendA', orcVendA, vendedorAUserId, nomeVendedorA)
    assertCreatedByAposInsert('orcGerB', orcGerB, gerenteB.user.id, nomeGerenteB)

    checks.push({
      id: 'orcamentos-created-by-pos-insert',
      description:
        'Apos INSERT, created_by_user_id e auth.uid() da sessao coincidem e created_by_name vem do profiles da empresa',
      ok: true,
    })

    const numeroPdfPattern = /^[0-9]{4}-[A-Z]$/
    for (const [label, orc] of Object.entries({ orcGerA1, orcGerA2, orcVendA, orcGerB })) {
      ensure(
        typeof orc.numero_pdf === 'string' && numeroPdfPattern.test(orc.numero_pdf),
        `numero_pdf invalido em ${label}: ${JSON.stringify(orc.numero_pdf)}`,
      )
    }

    const numerosEmpresaA = [orcGerA1.numero_pdf, orcGerA2.numero_pdf, orcVendA.numero_pdf]
    ensure(
      new Set(numerosEmpresaA).size === 3,
      `numero_pdf duplicado dentro da empresa A: ${numerosEmpresaA.join(', ')}`,
    )
    // Sequencia independente por empresa: empresa B comeca do mesmo prefixo que empresa A,
    // o que so e possivel se o contador for por company_id (regressao corrigida na 20260327150000).
    ensure(
      orcGerB.numero_pdf === orcGerA1.numero_pdf,
      `sequencia numero_pdf nao e independente entre empresas (A=${orcGerA1.numero_pdf}, B=${orcGerB.numero_pdf})`,
    )

    checks.push({
      id: 'numero-pdf-unico-por-empresa',
      description: 'numero_pdf e unico por empresa e a sequencia e independente entre empresas',
      ok: true,
    })

    // RLS leitura: gerente A enxerga tudo da propria empresa e nada das outras.
    const { data: rowsGerA, error: rowsGerAError } = await gerenteAClient
      .from('orcamentos')
      .select('id, company_id, vendedor_id')
    if (rowsGerAError) throw new Error(`Leitura gerente A falhou: ${rowsGerAError.message}`)
    ensure(
      (rowsGerA ?? []).length === 3,
      `gerente A deveria ver 3 orcamentos da empresa, viu ${rowsGerA?.length ?? 0}`,
    )
    ensure(
      (rowsGerA ?? []).every((row) => row.company_id === companyA.id),
      'gerente A enxergou orcamento de outra empresa',
    )
    const idsVisiveisGerA = new Set((rowsGerA ?? []).map((row) => row.id))
    ensure(
      idsVisiveisGerA.has(orcGerA1.id) && idsVisiveisGerA.has(orcGerA2.id) && idsVisiveisGerA.has(orcVendA.id),
      'gerente A nao enxerga todos os orcamentos da empresa A',
    )
    ensure(!idsVisiveisGerA.has(orcGerB.id), 'gerente A enxergou orcamento da empresa B (RLS quebrada)')

    checks.push({
      id: 'rls-gerente-lista-tudo-da-empresa',
      description: 'Gerente lista todos os orcamentos da propria empresa via RLS',
      ok: true,
    })

    // RLS leitura: vendedor A so enxerga os proprios orcamentos.
    const { data: rowsVendA, error: rowsVendAError } = await vendedorAClient
      .from('orcamentos')
      .select('id, company_id, vendedor_id')
    if (rowsVendAError) throw new Error(`Leitura vendedor A falhou: ${rowsVendAError.message}`)
    ensure(
      (rowsVendA ?? []).every((row) => row.vendedor_id === vendedorAUserId),
      `vendedor A enxergou orcamentos alheios: ${JSON.stringify(rowsVendA)}`,
    )
    const idsVisiveisVendA = new Set((rowsVendA ?? []).map((row) => row.id))
    ensure(idsVisiveisVendA.has(orcVendA.id), 'vendedor A nao enxerga o proprio orcamento')
    ensure(
      !idsVisiveisVendA.has(orcGerA1.id) && !idsVisiveisVendA.has(orcGerA2.id),
      'vendedor A enxergou orcamentos do gerente A (RLS quebrada)',
    )
    ensure(!idsVisiveisVendA.has(orcGerB.id), 'vendedor A enxergou orcamento de outra empresa (RLS quebrada)')

    checks.push({
      id: 'rls-vendedor-apenas-proprios',
      description: 'Vendedor lista apenas os proprios orcamentos via RLS',
      ok: true,
    })

    // RLS multi-tenant: gerente B nao enxerga empresa A.
    const { data: rowsGerB, error: rowsGerBError } = await gerenteBClient
      .from('orcamentos')
      .select('id, company_id')
    if (rowsGerBError) throw new Error(`Leitura gerente B falhou: ${rowsGerBError.message}`)
    ensure(
      (rowsGerB ?? []).every((row) => row.company_id === companyB.id),
      'gerente B enxergou orcamento de outra empresa',
    )
    const idsVisiveisGerB = new Set((rowsGerB ?? []).map((row) => row.id))
    ensure(idsVisiveisGerB.has(orcGerB.id), 'gerente B nao enxerga o proprio orcamento')
    ensure(
      !idsVisiveisGerB.has(orcGerA1.id) && !idsVisiveisGerB.has(orcGerA2.id) && !idsVisiveisGerB.has(orcVendA.id),
      'gerente B enxergou orcamentos da empresa A (vazamento cross-tenant)',
    )

    checks.push({
      id: 'rls-multi-tenant-cross-empresa-isolado',
      description: 'Leituras cruzadas entre empresas A e B sao bloqueadas pela RLS',
      ok: true,
    })

    // RLS delete: vendedor nao apaga orcamento (mesmo proprio) - apenas gerente pode.
    const deleteVendedorTentativa = await vendedorAClient
      .from('orcamentos')
      .delete()
      .eq('id', orcVendA.id)
      .select('id')
    ensure(
      !deleteVendedorTentativa.error,
      `delete por vendedor retornou erro inesperado em vez de filtrar via RLS: ${deleteVendedorTentativa.error?.message}`,
    )
    ensure(
      (deleteVendedorTentativa.data ?? []).length === 0,
      'vendedor conseguiu apagar orcamento (RLS deveria bloquear delete)',
    )
    const { data: ainda, error: aindaError } = await admin
      .from('orcamentos')
      .select('id')
      .eq('id', orcVendA.id)
      .maybeSingle()
    if (aindaError) throw aindaError
    ensure(!!ainda, 'orcamento do vendedor sumiu mesmo com policy de delete restrita a gerente')

    checks.push({
      id: 'rls-delete-vendedor-bloqueado',
      description: 'Delete de orcamento por vendedor e bloqueado por RLS (apenas gerente pode excluir)',
      ok: true,
    })

    // RLS update cruzado: vendedor A tenta editar orcamento do gerente A.
    const updateCruzadoTentativa = await vendedorAClient
      .from('orcamentos')
      .update({ desconto_total: 1 })
      .eq('id', orcGerA1.id)
      .select('id')
    ensure(
      !updateCruzadoTentativa.error,
      `update cruzado retornou erro em vez de filtrar via RLS: ${updateCruzadoTentativa.error?.message}`,
    )
    ensure(
      (updateCruzadoTentativa.data ?? []).length === 0,
      'vendedor conseguiu atualizar orcamento de outro usuario (RLS quebrada)',
    )

    checks.push({
      id: 'rls-update-cross-vendedor-bloqueado',
      description: 'Vendedor nao consegue atualizar orcamento alheio (RLS de update)',
      ok: true,
    })

    // create-vendedor com token de vendedor: deve falhar com 403 FORBIDDEN_ROLE.
    const createComoVendedor = await invokeFunction(
      supabaseUrl,
      anonKey,
      'create-vendedor',
      {
        nome: `Novo Vendedor ${runId}`,
        username: `nv_${runId}`,
        password: vendedorPassword,
      },
      vendedorAToken,
    )
    ensure(
      createComoVendedor.status === 403,
      `create-vendedor com token de vendedor deveria retornar 403: ${JSON.stringify(createComoVendedor)}`,
    )
    ensure(
      (createComoVendedor.json as { error_code?: string }).error_code === 'FORBIDDEN_ROLE',
      `error_code esperado FORBIDDEN_ROLE em create-vendedor com vendedor, recebido: ${JSON.stringify(createComoVendedor.json)}`,
    )

    checks.push({
      id: 'create-vendedor-bloqueia-token-vendedor',
      description: 'Vendedor autenticado nao consegue chamar create-vendedor (FORBIDDEN_ROLE)',
      ok: true,
    })

    console.log('Integracao de autenticacao validada com sucesso.')
    for (const check of checks) {
      console.log(`- [OK] ${check.id}: ${check.description}`)
    }
  } finally {
    await admin.auth.signOut()
    await publicClient.auth.signOut()

    // orcamentos.vendedor_id referencia auth.users sem ON DELETE CASCADE, entao apagamos
    // os dependentes via cascade da company antes de remover usuarios.
    for (const companyId of createdCompanyIds.slice().reverse()) {
      await admin.from('orcamentos').delete().eq('company_id', companyId)
      await admin.from('companies').delete().eq('id', companyId)
    }

    for (const userId of createdUserIds.slice().reverse()) {
      await admin.auth.admin.deleteUser(userId)
    }
  }
}

main().catch((error) => {
  console.error('Falha nos testes de integracao de autenticacao.')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
