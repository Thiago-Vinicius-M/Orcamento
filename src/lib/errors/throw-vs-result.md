# Política de erros: `throw` versus `Result`

## Camadas que lançam

Serviços de aplicação, repositórios e funções de domínio devem **lançar `Error`** (ou subclasses tipadas, quando existirem: `SupabaseConfigError`, `PermissionDeniedError`, erros de transição de orçamento, etc.). A chamada assume sucesso em tipos de retorno “felizes”; falhas interrompem o fluxo com exceção.

Isso mantém o código linear e evita espalhar `if (!result.ok)` por toda a pilha de negócio.

## Onde `Result` / `{ ok }` é aceitável

Apenas na **borda com UI ou fluxos assíncronos específicos**, quando o contrato público precisa ser não lançável:

- Hooks que orquestram formulários e exibem toast/estado de erro.
- Funções como `fetchCurrentRole`, que retornam `{ ok: true, role } | { ok: false, error }` para o chamador decidir sem `try/catch`.

## Mensagens ao usuário

Textos amigáveis para toast/tela vêm de `lib/errors` (`toUserMessage`, `parseFunctionsError`, `translatePermissionDenied`) ou de módulos de copy por fluxo (ex.: `auth/errors.ts` para cadastro de gerente). **Serviços e repositórios não devem chamar `toast.*`.**
