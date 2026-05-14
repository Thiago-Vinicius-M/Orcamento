# Allowed Redirect URLs (Gerente - confirmação de e-mail)

O app cadastra o gerente via Edge Function `register-gerente` e envia `emailRedirectTo` assim:

- Por padrão: `${window.location.origin}/auth/confirm-callback` (origem de quem está na página de cadastro).
- Se existir `VITE_AUTH_REDIRECT_BASE` no **build** (Vite substitui em compile-time): `${normalize(origin)}/auth/confirm-callback`, onde `normalize` aceita `https://neworca.vercel.app`, `https://neworca.vercel.app/` ou até `neworca.vercel.app` (vira `https://neworca.vercel.app`).

Após o Supabase redirecionar para essa rota, [`AuthConfirmCallbackPage`](src/pages/AuthConfirmCallbackPage.tsx) trata a sessão e envia o utilizador ao dashboard.

### Vercel

1. **Project → Settings → Environment Variables**: `VITE_AUTH_REDIRECT_BASE` = `https://neworca.vercel.app` (ou só `neworca.vercel.app`), marcado para **Production**.
2. Gere um **novo deployment** após salvar (o bundle antigo não “enxerga” a variável nova).
3. Se ainda vier link antigo no e-mail, faça **Redeploy** com **“Clear build cache”**.

No **Supabase Dashboard**, para esse fluxo funcionar, você precisa adicionar a origem do seu app em:

1. **Authentication** -> **URL Configuration** (ou equivalente)
2. **Site URL** e **Allowed Redirect URLs**

Adicione exatamente as URLs que o app vai gerar no seu ambiente, por exemplo:

- `http://localhost:5173/auth/confirm-callback`
- `http://127.0.0.1:5173/auth/confirm-callback`
- `https://neworca.vercel.app/auth/confirm-callback`
- `https://seu-dominio/auth/confirm-callback`

Se necessário, você pode usar wildcards (quando suportado pelo Supabase) para cobrir variações de host/porta, mas a recomendação mais segura é adicionar as URLs exatas do ambiente que você vai usar.

> **Nota:** pode manter `/configuracoes` nas URLs permitidas se ainda usar redirects antigos ou outros fluxos; o cadastro de gerente passa a preferir `/auth/confirm-callback` para alinhar o primeiro destino com a página dedicada de confirmação.

## Como descobrir sua origem atual

No navegador, abra o console e execute:

```js
window.location.origin
```

O valor retornado no console é a origem atual (equivalente à base quando `VITE_AUTH_REDIRECT_BASE` não está no bundle de produção).
