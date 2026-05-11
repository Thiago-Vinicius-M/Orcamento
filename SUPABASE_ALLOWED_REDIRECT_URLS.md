# Allowed Redirect URLs (Gerente - confirmação de e-mail)

O app cadastra o gerente via `supabase.auth.signUp()` e usa o seguinte `emailRedirectTo`:

- Por padrão: `${window.location.origin}/configuracoes`
- Se você definir `VITE_AUTH_REDIRECT_BASE`: `${VITE_AUTH_REDIRECT_BASE}/configuracoes`

No **Supabase Dashboard**, para esse fluxo funcionar, você precisa adicionar a origem do seu app em:

1. **Authentication** -> **URL Configuration** (ou equivalente)
2. **Site URL** e **Allowed Redirect URLs**

Adicione exatamente as URLs que o app vai gerar no seu ambiente, por exemplo:

- `http://localhost:5173/configuracoes`
- `http://127.0.0.1:5173/configuracoes`
- `http://seu-dominio/configuracoes`

Se necessário, você pode usar wildcards (quando suportado pelo Supabase) para cobrir variações de host/porta, mas a recomendação mais segura é adicionar as URLs exatas do ambiente que você vai usar.

## Como descobrir sua origem atual

No navegador, abra o console e execute:

```js
window.location.origin
```

O valor retornado é a base usada pelo app (quando `VITE_AUTH_REDIRECT_BASE` não estiver definido).
