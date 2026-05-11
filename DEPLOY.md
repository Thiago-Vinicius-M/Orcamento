# Deploy no Supabase (obrigatório para o app funcionar de ponta a ponta)

Se o cadastro “funciona” no navegador mas **clientes** continuam com `company_id` nulo, ou o e-mail não mostra o código, quase sempre é **uma destas etapas não aplicada no projeto remoto**.

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
| `SERVICE_ROLE_KEY` | **Service role** (JWT com `"role":"service_role"` em Settings → API). Obrigatória para checar `login_code` único em `companies` e operações admin. |

Via CLI (PowerShell):

```powershell
supabase secrets set SERVICE_ROLE_KEY="cole_aqui_a_service_role_key"
```

Sem `SERVICE_ROLE_KEY`, a geração de código único pode falhar ou dar resultado errado.

O repositório inclui [`supabase/config.toml`](supabase/config.toml) com `verify_jwt = false` para `register-gerente`. Sem isso, o cadastro **sem login** recebe 401 e o app parece “não mudar nada”.

Deploy:

```bash
supabase functions deploy register-gerente
```

(O CLI aplica `verify_jwt` a partir do `config.toml`. Em último caso: `supabase functions deploy register-gerente --no-verify-jwt`.)

## 3) Template de e-mail “Confirm sign up”

Para o e-mail mostrar `{{ .Data.login_code }}`, rode no projeto (com `SUPABASE_ACCESS_TOKEN`):

```bash
npx tsx scripts/setup-supabase-auth-templates.ts
```

Ou edite manualmente em **Authentication → Email Templates → Confirm sign up**.

## 4) Checklist rápido

- [ ] Migrações aplicadas no projeto remoto
- [ ] `register-gerente` deployada + secrets (`URL`, `ANON`, `SERVICE_ROLE`)
- [ ] Template de confirmação com `{{ .Data.login_code }}`
- [ ] SMTP configurado (se usar Gmail, ver `scripts/setup-supabase-smtp-gmail.ts`)

## 5) Reparo em tempo de execução

Se ainda assim um usuário ficou sem `profiles`, a migração `20260320120000_ensure_gerente_profile_rpc.sql` expõe `ensure_gerente_profile()`. O app chama essa RPC ao criar cliente quando `current_company_id()` vem vazio.
