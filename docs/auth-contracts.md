# Contratos Finais de Autenticacao

Este documento define os contratos finais dos fluxos de login de gerente e vendedor.
Ele e a referencia de integracao para frontend, edge functions e testes de autenticacao.

## Escopo

- Gerente autentica com `email + senha` usando Supabase Auth.
- Vendedor autentica com `codigo_da_empresa + usuario + senha` via edge function `login-vendedor`.
- Regras de empresa e perfil sao validadas no backend.

## Contrato 1: Login de Gerente

### Operacao (gerente)

- **Canal:** Supabase Auth (cliente JS)
- **Metodo:** `supabase.auth.signInWithPassword`
- **Entrada obrigatoria:**
  - `email: string` (formato de email valido)
  - `password: string` (minimo 6 caracteres)

### Exemplo de request (frontend)

```ts
await supabase.auth.signInWithPassword({
  email: "gerente@empresa.com",
  password: "SenhaForte123",
})
```

### Resposta de sucesso

- Sessao Supabase valida (`session`) com JWT.
- Usuario autenticado (`user`) com perfil `gerente`.
- O `company_id` do gerente e resolvido pelo backend/policies, nunca por input do cliente.

### Erros esperados

- `INVALID_CREDENTIALS`: email/senha invalidos.
- `EMAIL_NOT_CONFIRMED`: email ainda nao confirmado.
- `AUTH_PROVIDER_ERROR`: indisponibilidade temporaria de auth.

### Pos-condicoes (gerente)

- Sessao ativa para acesso ao painel do gerente.
- Fluxos protegidos (ex.: criacao de vendedor) exigem JWT e perfil `gerente`.

---

## Contrato 2: Login de Vendedor

### Operacao (vendedor)

- **Canal:** Edge Function `login-vendedor`
- **Rota:** `POST /functions/v1/login-vendedor`
- **Auth de entrada:** publica (sem JWT previo)
- **Objetivo:** autenticar sem expor email no fluxo de UI.

### Request

```json
{
  "company_code": "1",
  "username": "joao.vendas",
  "password": "SenhaForte123"
}
```

> **Formato do `company_code`:** string numerica sequencial (`"1"`, `"2"`, `"3"`, ...) gerada pelo banco via coluna `companies.login_code` (derivada de `bigint generated always as identity`). O cliente envia o valor exatamente como recebido no cadastro do gerente — sem zero-padding, sem prefixo. A validacao no frontend (`LoginVendedorPage`) aceita apenas digitos (`^\d+$`).

### Validacoes obrigatorias

1. `company_code` deve mapear para empresa ativa (string numerica que existe em `companies.login_code`).
2. `username` deve existir na empresa informada.
3. `password` deve ser validada contra credencial persistida.
4. Usuario deve estar ativo.
5. Perfil final deve ser `vendedor` com `company_id` da mesma empresa.

### Resposta de sucesso (`200`)

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<refresh_token>",
  "expires_in": 3600,
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "role": "vendedor",
    "company_id": "uuid"
  }
}
```

### Erros funcionais

- `400 INVALID_PAYLOAD`: campos ausentes, tipos invalidos ou formato incorreto.
- `401 INVALID_CREDENTIALS`: usuario/senha invalidos, **ou** `company_code` inexistente (mesma resposta por anti-enumeração).
- `403 USER_INACTIVE`: credencial desativada.
- `429 TOO_MANY_ATTEMPTS`: bloqueio temporario por tentativas excessivas.
- `500 INTERNAL_ERROR`: falha inesperada no backend.

> **Anti-enumeração:** codigo de empresa inexistente nao retorna `404` distinto; o cliente recebe `401 INVALID_CREDENTIALS` com a mesma mensagem generica de credencial invalida.

### Formato padrao de erro

```json
{
  "error_code": "INVALID_CREDENTIALS",
  "message": "Usuario ou senha invalidos.",
  "request_id": "uuid-opcional"
}
```

### Pos-condicoes (vendedor)

- Sessao JWT de vendedor ativa no cliente.
- Rotas protegidas aplicam RLS por `company_id` e `role = vendedor`.

---

## Regras transversais de seguranca

- Cliente nunca informa nem resolve email de vendedor.
- Vendedor e unico por empresa: `(company_id, username)`.
- Criacao de vendedor so e permitida para gerente autenticado.
- Todo vendedor criado herda `company_id` da sessao do gerente.
- Mensagens de erro nao devem revelar existencia de usuario fora da empresa.

## Endpoint legado `resolve-vendedor-email`

- **Estado:** descontinuado. Qualquer chamada valida retorna **410 Gone** com corpo JSON estavel (`error_code: ENDPOINT_DEPRECATED`) e **sem** dados de autenticacao ou e-mail.

## Criterios de aceite para contratos

- Login de gerente funciona somente com `email + senha` (com email confirmado).
- Login de vendedor funciona somente com `company_code + username + password`.
- Nao existe dependencia de endpoint de resolucao de email no fluxo principal de vendedor.
- Contratos de erro permitem cobertura de testes de integracao e regressao.
