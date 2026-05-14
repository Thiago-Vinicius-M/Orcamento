# Deploy no Supabase (obrigatório para o app funcionar de ponta a ponta)

Se o cadastro “funciona” no navegador mas **clientes** continuam com `company_id` nulo, ou o e-mail não mostra o código, quase sempre é **uma destas etapas não aplicada no projeto remoto**.

## 0) Pré-requisito — autenticação da CLI (resolve `401 Unauthorized`)

Todos os comandos `supabase functions deploy`, `supabase db push`, `supabase secrets …` falam com a **Management API** (`api.supabase.com`) e exigem um Personal Access Token (PAT). Quando o token está ausente ou expirou, o CLI responde:

```text
{"message":"Unauthorized"} (status 401)
```

### 0.1) Procedimento interativo (máquina de desenvolvimento)

```powershell
# (opcional) zera token antigo, se houver suspeita de expiração
Remove-Item "$env:USERPROFILE\.supabase\access-token" -ErrorAction SilentlyContinue

# 1. login interativo (abre browser, salva o PAT em ~/.supabase/access-token)
npx supabase login

# 2. valida que o token funciona — deve listar projetos da conta
npx supabase projects list

# 3. linka este repositório ao projeto remoto (uma vez por máquina)
npx supabase link --project-ref "<seu_project_ref>"
```

Após o passo 3, o ref fica gravado em `supabase/.temp/project-ref` e os comandos subsequentes (`functions deploy`, `db push`, etc.) inferem o projeto sem precisar do flag `--project-ref`.

### 0.2) Fallback para CI / headless (sem browser)

Em pipelines não há como abrir o browser. Use um Personal Access Token criado em <https://supabase.com/dashboard/account/tokens> e exporte como variável de ambiente:

```powershell
# PowerShell (Windows)
$env:SUPABASE_ACCESS_TOKEN = "sbp_<personal-access-token>"
npx supabase projects list   # validação
npx supabase functions deploy register-gerente
```

```bash
# bash (Linux/macOS, GitHub Actions, etc.)
export SUPABASE_ACCESS_TOKEN="sbp_<personal-access-token>"
npx supabase projects list
npx supabase functions deploy register-gerente
```

Em GitHub Actions, registre o PAT como secret e injete no job:

```yaml
- name: Deploy Edge Functions
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  run: |
    npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    npm run supabase:deploy:functions
```

### 0.3) Erros comuns relacionados ao 401

- **`Access token not provided`** → não está logado nem há `SUPABASE_ACCESS_TOKEN`. Faça `npx supabase login` ou exporte a variável (passo 0.2).
- **`401 Unauthorized` mesmo logado** → token expirou; rode `Remove-Item "$env:USERPROFILE\.supabase\access-token"` e refaça `npx supabase login`.
- **`project ref is invalid`** ou **400 Bad Request** ao rodar deploy → o script está expandindo `$SUPABASE_PROJECT_REF` em PowerShell (sintaxe bash). O `npm run supabase:deploy:functions` deste repositório **não** usa `$VAR`; o ref vem do `supabase link` (passo 0.1).
- **CLI desatualizada** → cheque `npx supabase --version` (deve ser ≥ `^2.83.0` conforme `package.json`). Atualize com `npm install --save-dev supabase@latest`.

## 1) Migrações SQL

As tabelas, triggers (`handle_gerente_onboarding`), RPCs (`ensure_gerente_profile`, `backfill_gerente_profiles`, etc.) precisam existir **no projeto hospedado**.

- Via CLI: `supabase link` + `supabase db push`
- Ou: copiar e executar o conteúdo das migrações em **SQL Editor** do Dashboard (na ordem dos arquivos em `supabase/migrations/`).

### Se o banco remoto já tinha o schema, mas o histórico de migrações estava vazio

O `db push` pode tentar rodar `init_schema` de novo e falhar (`type already exists`). Nesse caso, marque as migrações antigas como já aplicadas e faça push só das novas:

```bash
npx supabase migration repair --status applied 20260317120001 20260318150000 20260319100000 20260319103000 20260319160000 20260319173000
npx supabase db push
```

(Use os nomes de versão que constam em `supabase migration list`.)

## 2) Edge Function `register-gerente`

O cadastro do gerente chama `supabase.functions.invoke('register-gerente', ...)`. A função precisa estar **deployada** e com secrets.

Secrets necessários (Dashboard → Edge Functions → Secrets, ou `supabase secrets set`):

| Variável | Descrição |
|----------|-----------|
| *(automático)* | `SUPABASE_URL` e `SUPABASE_ANON_KEY` são **injetados pela plataforma** nas Edge Functions — **não** defina com `supabase secrets set` (o CLI recusa nomes `SUPABASE_*`). |
| `SERVICE_ROLE_KEY` | **Service role** (JWT com `"role":"service_role"` em Settings → API). Obrigatória para invocar a RPC `create_company_with_next_login_code` (que insere a empresa e retorna o `login_code` numérico sequencial gerado pelo banco) e para operações admin de criação do usuário. |

Via CLI (PowerShell):

```powershell
supabase secrets set SERVICE_ROLE_KEY="cole_aqui_a_service_role_key"
```

Sem `SERVICE_ROLE_KEY`, a chamada à RPC `create_company_with_next_login_code` falha — a sequência identity de `companies.login_code` só é alocada via service role (`anon`/`authenticated` não têm `EXECUTE` na função).

O repositório inclui [`supabase/config.toml`](supabase/config.toml) com `verify_jwt = false` para `register-gerente`. Sem isso, o cadastro **sem login** recebe 401 e o app parece “não mudar nada”.

Deploy:

```bash
supabase functions deploy register-gerente
```

(O CLI aplica `verify_jwt` a partir do `config.toml`. Em último caso: `supabase functions deploy register-gerente --no-verify-jwt`.)

**Allowed Redirect URLs:** o cadastro envia `emailRedirectTo` com o path `/auth/confirm-callback` na origem do app. No Supabase (**Authentication → URL Configuration**), inclua essa URL completa para cada ambiente (local, preview, produção). Lista de exemplos: [`SUPABASE_ALLOWED_REDIRECT_URLS.md`](SUPABASE_ALLOWED_REDIRECT_URLS.md).

## 3) Template de e-mail “Confirm sign up”

O `login_code` da empresa é uma string numérica sequencial (`1`, `2`, `3`, ...) gerada pelo banco via `bigint generated always as identity` em `companies` — sem prefixo (`NEWORCA01` etc.) e sem zero-padding. O template renderiza esse valor exatamente como vem do banco.

### Logo no e-mail (PNG por HTTPS)

O repositório inclui [`public/email/logo-orca.png`](public/email/logo-orca.png) (cópia de `src/assets/img/logoOrca.png`) para uso em `<img src="…">` no HTML do template do Supabase. O arquivo precisa ir para produção **no deploy do front** (pasta `public/` do Vite vira raiz estática); sem isso a URL da imagem retorna 404.

**URL absoluta em produção** (substitua pela origem real do site, alinhada ao que você usa em `VITE_AUTH_REDIRECT_BASE` — apenas `https` + host, sem path de rota):

`https://<sua-origem-producao>/email/logo-orca.png`

Exemplo: se `VITE_AUTH_REDIRECT_BASE` for `https://neworca.vercel.app`, a imagem fica em `https://neworca.vercel.app/email/logo-orca.png`.

Clientes de e-mail costumam bloquear ou renderizar mal SVG em `<img>`; o fluxo suportado aqui é **PNG** neste caminho. `public/favicon.svg` pode ser citado como alternativa, com risco em Outlook antigo e alguns webmails.

### Variáveis `CONFIRMATION_*` (opcional)

O script [`scripts/setup-supabase-auth-templates.ts`](scripts/setup-supabase-auth-templates.ts) envia assunto e HTML para a Management API. Por padrão usa valores embutidos no repositório.

- **`CONFIRMATION_SUBJECT`**: uma linha (assunto). Se ausente, usa o padrão do script.
- **`CONFIRMATION_CONTENT`**: HTML completo do corpo. Se ausente, usa o HTML padrão (tabela, CTA, fallback de link). Qualquer override **deve** conter os literais `{{ .Data.login_code }}` e `{{ .ConfirmationURL }}` — o script aborta se faltar um deles.
- **`.env` e HTML longo**: o carregamento opcional de `.env` no script trata **uma linha por variável**. Para sobrescrever `CONFIRMATION_CONTENT` com HTML grande, use uma única linha minificada no `.env` ou defina a variável no CI/shell (`export CONFIRMATION_CONTENT='…'`) onde multilinha é aceita. Detalhes também em [`.env.example`](.env.example).
- **Logo no HTML padrão**: com `VITE_AUTH_REDIRECT_BASE` definido no ambiente ao rodar o script (por exemplo no mesmo `.env` que o script lê), o template padrão inclui `<img src="<origem>/email/logo-orca.png">`. Sem isso, o padrão cai em um cabeçalho textual “NewOrca”.

### Aplicar o template (com token)

O patch usa `SUPABASE_URL` (para derivar o `project ref`) e **`SUPABASE_ACCESS_TOKEN`** (PAT da conta; veja secção **0**). Exemplos:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_<personal-access-token>"
npm run supabase:auth-templates
```

```bash
export SUPABASE_ACCESS_TOKEN="sbp_<personal-access-token>"
npm run supabase:auth-templates
```

Equivalente: `npx tsx scripts/setup-supabase-auth-templates.ts`.

Ou edite manualmente em **Authentication → Email Templates → Confirm sign up**.

### Checklist de verificação do e-mail

Depois de aplicar o template e publicar o front com `public/email/logo-orca.png`:

- [ ] Fluxo real: **novo cadastro** (signup) ou **reenvio** do e-mail de confirmação (tipo signup), conforme o fluxo do app.
- [ ] **Gmail** (web e/ou app): layout legível, imagem carrega, botão e link de confirmação abrem o destino correto.
- [ ] **Outlook** (web e/ou cliente Windows): mesmo critério — Outlook costuma ser o mais rigoroso com HTML em tabela.
- [ ] **Mobile** (cliente nativo ou webmail no telefone): sem overflow estranho; CTA tocável.
- [ ] **Imagem**: `https://<origem-produção>/email/logo-orca.png` abre no navegador e aparece no corpo do e-mail (não bloqueada como domínio desconhecido em testes rápidos).
- [ ] **Link**: `{{ .ConfirmationURL }}` funciona; o parágrafo de fallback com URL visível também.
- [ ] **Código**: `{{ .Data.login_code }}` aparece destacado e legível (monoespaçado no template padrão).

## 4) Checklist rápido

- [ ] Migrações aplicadas no projeto remoto
- [ ] `register-gerente` deployada + secrets (`URL`, `ANON`, `SERVICE_ROLE`)
- [ ] **Allowed Redirect URLs** com `…/auth/confirm-callback` para cada origem usada (ver `SUPABASE_ALLOWED_REDIRECT_URLS.md`)
- [ ] Template de confirmação com `{{ .Data.login_code }}` e `{{ .ConfirmationURL }}` (script `npm run supabase:auth-templates` com `SUPABASE_ACCESS_TOKEN`, ou edição manual no Dashboard)
- [ ] Logo do template: URL `https://<origem-produção>/email/logo-orca.png` abre no navegador (arquivo em `public/email/` incluído no deploy do front)
- [ ] E-mail testado em **Gmail**, **Outlook** e **mobile** (imagem, link de confirmação e código legível)
- [ ] SMTP configurado (se usar Gmail, ver `scripts/setup-supabase-smtp-gmail.ts`)

## 5) Reparo em tempo de execução

Se ainda assim um usuário ficou sem `profiles`, a migração `20260320120000_ensure_gerente_profile_rpc.sql` expõe `ensure_gerente_profile()`. O app chama essa RPC ao criar cliente quando `current_company_id()` vem vazio.
