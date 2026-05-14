# NewOrca — Sistema de Orçamentos

Aplicação web para gestão de orçamentos (clientes, produtos, orçamentos e geração de PDF) usando **React + Vite** no frontend e **Supabase (Postgres + Auth + Edge Functions)** como backend principal. O repositório também inclui um **servidor Node/Fastify** opcional para geração de PDF (porta `3333`), mas o fluxo atual do app gera PDF **no cliente**.

## Execução Rápida (Quick Start)

> Objetivo: subir o app localmente (frontend) apontando para um projeto Supabase (remoto ou local), com schema/migrações aplicados e Edge Functions deployadas.

1. Instale dependências:

```powershell
cd "e:\Projetos\NewOrca"
npm ci
```

1. Crie seu `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

1. Preencha no `.env` (mínimo para abrir o app):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

1. Aplique migrações no Supabase e faça deploy das Edge Functions:

- Veja o passo a passo em **“Configuração do Supabase (DB + Functions)”** abaixo (inclui comandos prontos).

1. Rode o frontend:

```powershell
npm run dev
```

Abra `http://localhost:5173`.

## Stack Técnica (detectada automaticamente)

- **Linguagem principal**: TypeScript
- **Frontend**: React + Vite
- **Backend (principal)**: Supabase
  - **Banco de dados**: Postgres (gerenciado pelo Supabase)
  - **Auth**: Supabase Auth (e-mail/senha + templates)
  - **Edge Functions**: Deno (funções HTTP)
- **Backend (opcional)**: Node.js + Fastify (servidor HTTP para PDF)
- **Gerenciador de dependências**: npm (`package-lock.json`)
- **Validação de dados**: Zod
- **Testes**: Vitest (unit) + scripts de integração (Supabase)
- **Formatação/Lint**: Prettier + ESLint

## Portas e Serviços

- **Frontend (Vite dev server)**: `5173`
- **PDF backend (Fastify, opcional)**: `3333`
  - Healthcheck: `GET /health`
  - PDF route: `POST /orcamentos/:id/pdf` (payload validado por `OrcamentoSchema`)
- **Supabase (remoto)**: `https://<project-ref>.supabase.co`
- **Supabase local (opcional)**: portas variam conforme CLI (ex.: API `54321`, DB `54322`, Studio `54323`)

## Estrutura de Pastas (visão geral)

- **`src/`**
  - **`pages/`**: telas (login, cadastro gerente, vendedores, orçamento, etc.)
  - **`auth/`**: helpers de autenticação e tratamento de erro em functions
  - **`lib/`**: `supabaseClient.ts` e utilitários
  - **`repositories/`**: acesso ao Supabase (queries, loads para PDF etc.)
  - **`application/`**: serviços de caso de uso (carregar detalhe, gerar PDF, ações)
  - **`domain/`**: regras de negócio (status, cálculos, mapeamentos)
  - **`pdf/`**: geração de PDF (pdf-lib) usada no cliente
  - **`routes/`** e **`server.ts`**: backend Fastify (opcional)
- **`supabase/`**
  - **`migrations/`**: migrações SQL do schema (RLS, triggers, RPCs)
  - **`functions/`**: Edge Functions (Deno) invocadas pelo frontend
  - **`config.toml`**: configurações de functions (ex.: `verify_jwt = false`)
- **`scripts/`**
  - Setup e automações (SMTP, templates de e-mail, testes de integração)

## Arquivos Importantes

- **`package.json`**: scripts, deps e descrição do projeto
- **`.env.example`**: variáveis de ambiente necessárias (modelo)
- **`supabase/migrations/*`**: schema e políticas RLS
- **`supabase/functions/*`**: Edge Functions
- **`DEPLOY.md`**: checklist de deploy no Supabase (migrações + secrets + templates)
- **`SUPABASE_ALLOWED_REDIRECT_URLS.md`**: configuração de redirect de e-mail
- **`SUPABASE_SMTP_GMAIL_SETUP.md`**: guia de SMTP com Gmail

## Pré-requisitos (ambiente do zero)

### Recomendado

- **Node.js**: 20+ (LTS) ou 22+ (LTS)
- **npm**: o que vem com o Node (usa `package-lock.json`)
- **Git**: para clonar/atualizar
- **Supabase**:
  - **Opção A (mais comum)**: um projeto Supabase **remoto** no Dashboard
  - **Opção B (local)**: Supabase CLI + Docker Desktop para rodar a stack local

### Opcional (conforme uso)

- **Docker Desktop**: necessário apenas se for usar Supabase local (`supabase start`)
- **Supabase CLI**: para aplicar migrações e deployar functions com comandos

## Instalação de dependências

Na raiz do projeto:

```powershell
npm ci
```

Se você preferir instalar sem travar versões (não recomendado para primeiro setup):

```powershell
npm install
```

## Variáveis de ambiente

Use `.env.example` como base.

### Variáveis mínimas (frontend)

- **`VITE_SUPABASE_URL`**: URL do projeto Supabase
- **`VITE_SUPABASE_ANON_KEY`**: anon key do projeto (Settings → API)

### Variáveis para scripts / deploy (Supabase)

- **`SUPABASE_URL`**: mesma URL do Supabase (pode ser igual à `VITE_SUPABASE_URL`)
- **`SUPABASE_ANON_KEY`**: mesma anon key (pode ser igual à `VITE_SUPABASE_ANON_KEY`)
- **`SUPABASE_SERVICE_ROLE_KEY`**: service role key (Settings → API). **Não use no frontend.**
- **`SUPABASE_ACCESS_TOKEN`**: token de gestão (Account → Access Tokens) para scripts de Management API
- **`SUPABASE_PROJECT_REF`**: project ref (usado em deploy de functions)

### Variáveis de redirect (auth)

- **`VITE_AUTH_REDIRECT_BASE`** (opcional): origem para montar o `emailRedirectTo` do signup do gerente (`/auth/confirm-callback` em cima dela).  
  - default: `window.location.origin` (quem se cadastra em `https://neworca.vercel.app` já gera link correto **sem** essa variável).  
  - **Vite embute `VITE_*` no build**: no [Vercel](https://vercel.com/), crie a variável para o ambiente **Production**, salve e faça um **novo deploy** (se o link do e-mail não mudar, use *Redeploy* sem cache).  
  - Aceita só o host (ex.: `neworca.vercel.app`); aspas no valor são ignoradas.

### Servidor PDF (opcional)

- **`PORT`**: default `3333`
- **`HOST`**: default `0.0.0.0`

### SMTP (scripts / setup)

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, `SMTP_FROM_ADDRESS`

### Testes de integração (opcional)

- `TEST_EMAIL`, `TEST_PASSWORD`, `TEST_EMAIL_REDIRECT_TO`, `SKIP_SIGNUP_TEST`

## Configuração do Supabase (DB + Functions)

O app depende de:

- **Migrações SQL** em `supabase/migrations/` (tabelas, triggers, RPCs e políticas RLS)
- **Edge Functions**:
  - `register-gerente` (cadastro do gerente + empresa/perfil)
  - `create-vendedor` (gerente cria vendedor)
  - `login-vendedor` (login com código da empresa + usuário + senha — o código da empresa é uma string numérica sequencial, ex.: `1`, `2`, `3`, ...)
  - `resolve-vendedor-email` (legado; responde **410 Gone** sem dados sensíveis — não usar em fluxos novos)

### Opção A — Usar Supabase remoto (Dashboard)

#### 1) Conectar o CLI ao projeto (uma vez)

```powershell
npx supabase login
npx supabase link --project-ref "<seu_project_ref>"
```

#### 2) Aplicar migrações no banco remoto

```powershell
npx supabase db push
```

Se o projeto remoto já tinha schema e o histórico de migrações estiver “desalinhado”, siga o procedimento em `DEPLOY.md` (inclui `migration repair`).

#### 3) Configurar secrets das Edge Functions

No Supabase Dashboard (Edge Functions → Secrets) ou via CLI:

```powershell
npx supabase secrets set SERVICE_ROLE_KEY="<cole_a_service_role_key_aqui>"
```

> Observação: na plataforma, `SUPABASE_URL` e `SUPABASE_ANON_KEY` são injetadas automaticamente nas Edge Functions. O código também aceita `SUPABASE_SERVICE_ROLE_KEY`, mas o recomendado para functions é `SERVICE_ROLE_KEY` (ver `DEPLOY.md`).

#### 4) Deploy das Edge Functions

```powershell
npx supabase functions deploy register-gerente
npx supabase functions deploy create-vendedor
npx supabase functions deploy login-vendedor
npx supabase functions deploy resolve-vendedor-email
```

Como atalho, há o script `npm run supabase:deploy:functions`, que faz o deploy das quatro functions em uma única chamada.

> **Pré-requisito do atalho:** o CLI infere o `--project-ref` a partir do projeto **linkado** (`supabase/.temp/project-ref`). Antes da primeira execução, rode:
>
> ```powershell
> npx supabase login
> npx supabase link --project-ref "<seu_project_ref>"
> ```
>
> Em ambientes CI/headless, defina também `SUPABASE_ACCESS_TOKEN` (Personal Access Token gerado em <https://supabase.com/dashboard/account/tokens>) — sem ele, o CLI responde **401 Unauthorized** ao chamar a Management API.
>
> Não usamos `--project-ref $SUPABASE_PROJECT_REF` no script porque é sintaxe **bash** e o `$VAR` não expande em PowerShell, o que faz o CLI receber a string literal e devolver 401/400.

#### 5) Configurar redirect URLs (confirmação de e-mail)

Veja `SUPABASE_ALLOWED_REDIRECT_URLS.md`. Para dev local, garanta que exista:

- `http://localhost:5173/auth/confirm-callback`

No Dashboard: Authentication → URL Configuration → Site URL / Allowed Redirect URLs.

#### 6) (Opcional) Configurar template de e-mail e SMTP

- Template “Confirm sign up” com `{{ .Data.login_code }}`: ver `DEPLOY.md`
- SMTP Gmail: ver `SUPABASE_SMTP_GMAIL_SETUP.md` e/ou rode:

```powershell
npx tsx scripts/setup-supabase-smtp-gmail.ts
```

### Opção B — Rodar Supabase local (sem depender de um projeto remoto)

> Esta opção exige **Docker Desktop** e Supabase CLI. Útil para desenvolvimento isolado, mas o fluxo de Edge Functions/SMTP costuma ser mais simples no remoto.

1. Suba a stack local:

```powershell
npx supabase start
```

1. Aplique migrações localmente (normalmente automático no start; se necessário):

```powershell
npx supabase db reset
```

1. Pegue as chaves/URL do ambiente local e preencha `.env` (o `supabase start` imprime essas infos).

1. Sirva Edge Functions localmente (se necessário para testes):

```powershell
npx supabase functions serve
```

## Como iniciar o sistema

### 1) Frontend (principal)

```powershell
npm run dev
```

Abra `http://localhost:5173`.

### 2) Backend PDF (opcional)

Esse servidor sobe `GET /health` e `POST /orcamentos/:id/pdf`. Atualmente o app gera PDF no cliente, mas o serviço pode ser útil para geração server-side.

Em desenvolvimento (watch):

```powershell
npm run dev:pdf
```

Em produção (build + start):

```powershell
npm run build:pdf
npm run start:pdf
```

Healthcheck:

```powershell
curl http://localhost:3333/health
```

## Migrations/Seeds

- **Migrações**: `supabase/migrations/*.sql` (aplicar via `npx supabase db push` no remoto ou `npx supabase db reset` no local).
- **Seeds**: não há um seed explícito detectado; o sistema opera a partir do cadastro de gerente e criação de dados via UI.

## Como testar se está tudo funcionando

### Checklist de validação (final)

- [ ] `npm ci` executa sem erros
- [ ] `.env` preenchido com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- [ ] Migrações aplicadas no Supabase (tabelas e RLS criadas)
- [ ] Edge Functions deployadas (ou servidas localmente)
- [ ] Redirect URLs configuradas para o `emailRedirectTo` do signup (`/auth/confirm-callback` na origem do app)
- [ ] App abre em `http://localhost:5173`
- [ ] Cadastro de gerente cria conta e retorna `login_code` numérico sequencial (`1`, `2`, `3`, ...) ou chega e-mail de confirmação
- [ ] Login (gerente ou vendedor) funciona
- [ ] CRUD de clientes/produtos funciona (conforme permissões)
- [ ] Geração de PDF funciona (download no browser)

### Testes automatizados

Unit tests:

```powershell
npm test
```

Integração (autenticação via Edge Functions). Requer `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` configurados e functions acessíveis:

```powershell
npm run test:integration:auth
```

## Troubleshooting (erros comuns)

### 1) Tela “Supabase não configurado”

- **Causa**: faltam `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` no `.env`.
- **Como resolver**: preencha o `.env` e reinicie `npm run dev`.

### 2) Cadastro “funciona” mas `company_id` fica nulo / dados não aparecem

- **Causas comuns**:
  - migrações não aplicadas no projeto remoto
  - Edge Function `register-gerente` não está deployada ou sem secret `SERVICE_ROLE_KEY`
- **Como resolver**: siga `DEPLOY.md` (migrações + deploy + secrets).

### 3) Signup de gerente retorna 401 na function

- **Causa**: `register-gerente` precisa aceitar chamada sem JWT.
- **Como resolver**: confirme que `supabase/config.toml` foi aplicado no deploy (tem `verify_jwt = false`).

### 4) E-mail de confirmação não chega

- **Causas comuns**: SMTP não configurado, caiu em spam, redirect URL inválida.
- **Como resolver**:
  - configure SMTP conforme `SUPABASE_SMTP_GMAIL_SETUP.md`
  - verifique `SUPABASE_ALLOWED_REDIRECT_URLS.md`

### 5) `functions.invoke(...)` falha sem mensagem útil

- O app tenta extrair detalhes de `error.context` (ver `src/lib/errors/parseFunctionsError.ts`, usado em fluxos como cadastro de gerente e login de vendedor). Confira o console do navegador e logs da Edge Function no Dashboard.

### 6) `supabase functions deploy` (ou `db push`) retorna `401 Unauthorized`

- **Causa**: o CLI fala com a Management API e exige Personal Access Token. Ou nunca foi feito `supabase login` nesta máquina, ou o token expirou, ou em CI/headless `SUPABASE_ACCESS_TOKEN` não está exportado.
- **Como resolver**:
  - Em máquina de dev: `npx supabase login` (abre o browser) → valide com `npx supabase projects list` (precisa listar projetos).
  - Em CI/headless: gere um PAT em <https://supabase.com/dashboard/account/tokens>, exporte como `SUPABASE_ACCESS_TOKEN` e rode `npx supabase projects list` antes do deploy para confirmar.
  - Passo a passo completo (incluindo limpeza de token velho e exemplo de GitHub Actions): seção **“0) Pré-requisito — autenticação da CLI”** em `DEPLOY.md`.

## Arquitetura do Projeto (alto nível)

### Fluxo principal

1) **Frontend** (React) autentica via Supabase:
   - gerente: cadastro via Edge Function `register-gerente` e login padrão (email/senha). O cadastro retorna `login_code` numérico sequencial (`1`, `2`, `3`, ...) gerado pelo banco (`bigint generated always as identity` → `companies.login_code text`).
   - vendedor: login via Edge Function `login-vendedor` (código da empresa + usuário + senha), depois `supabase.auth.setSession(...)`. O código da empresa é a string numérica sequencial recebida no cadastro do gerente.
2) **Autorização**: políticas RLS no Postgres garantem isolamento por `company_id` e regras por `role`.
3) **Dados**: CRUD e consultas via `repositories/` usando Supabase JS.
4) **PDF**: atualmente gerado no cliente usando `pdf-lib` com dados carregados do Supabase.

### Dependências entre serviços (ordem correta)

1) Supabase (DB + Auth) com migrações aplicadas
2) Edge Functions deployadas + secrets configurados
3) Frontend (`npm run dev`)
4) (Opcional) Backend PDF (`npm run dev:pdf`)

## Docker

Não há `Dockerfile`/`docker-compose.yml` no repositório neste momento.

- Para “rodar com Docker” hoje, a alternativa suportada é **rodar o Supabase local** via `npx supabase start` (que usa Docker por baixo).
- Se você quiser containerizar o frontend e o PDF backend, é uma melhoria possível (ver “Melhorias”).

## Inconsistências / problemas detectados

- **`.env` com segredos no diretório**: existe um `.env` preenchido no workspace.  
  - O `.gitignore` ignora `.env`, mas **se isso já foi commitado em algum momento**, as chaves devem ser **rotacionadas** imediatamente no Supabase e no provedor de e-mail.
  - Recomendo manter apenas `.env.example` no repositório e usar `.env` localmente (como já está configurado no `.gitignore`).
- **README antigo**: estava como template do Vite; foi substituído por documentação do projeto.

## Melhorias sugeridas

- Adicionar `docker-compose.yml` para:
  - frontend
  - PDF backend
  - (opcional) Supabase local (ou instruções padronizadas)
- Criar um script “bootstrap” (PowerShell) que:
  - valida `.env`
  - roda `npm ci`
  - roda `supabase link`/`db push` (quando aplicável)
  - deploya functions e seta secrets
