# Script SMTP (Supabase) - Gmail

Este script configura o SMTP do Auth no Supabase via **Management API** e, em seguida, dispara um `signUp` de teste (para você conferir a entrega no inbox/spam).

## Como rodar

1. Instale dependências (se necessário):
   - `npm i`
2. Rode:
   - `npx tsx scripts/setup-supabase-smtp-gmail.ts`

## Variáveis de ambiente (PowerShell)

- `SUPABASE_URL` (ex.: valor de `VITE_SUPABASE_URL` no `.env`)
- `SUPABASE_ANON_KEY` (ex.: valor de `VITE_SUPABASE_ANON_KEY` no `.env`)
- `SUPABASE_ACCESS_TOKEN` (token de Gestão/Account Tokens no Supabase)
- `SMTP_HOST` (para Gmail: `smtp.gmail.com`)
- `SMTP_PORT` (`465` com SSL ou `587` com STARTTLS)
- `SMTP_USERNAME` (seu e-mail Gmail)
- `SMTP_APP_PASSWORD` (App Password do Gmail)
- `SMTP_FROM_ADDRESS` (normalmente igual a `SMTP_USERNAME`)
- `SMTP_SENDER_NAME` (opcional; default `NewOrca`)

Teste via signup (opcional, mas recomendado):

- `TEST_EMAIL` (e-mail que deve receber o link)
- `TEST_PASSWORD` (senha para o usuário de teste)
- `TEST_EMAIL_REDIRECT_TO` (opcional; default `http://localhost:5173/auth/confirm-callback`)
- `SKIP_SIGNUP_TEST` (opcional; `true` para só configurar o SMTP)

## Validação

Depois de rodar:

- confira o inbox/spam do `TEST_EMAIL`
- e, se o objetivo for estritamente o botão do Dashboard, também é possível usar **Send test email** na tela `Authentication -> Providers -> Email (SMTP)`.
