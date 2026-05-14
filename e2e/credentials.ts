/** Credenciais do fluxo de gerente nos testes E2E (defina em `.env` para o seu projeto). */
export const e2eGerenteEmail =
  process.env.PLAYWRIGHT_TEST_EMAIL ?? "e2e.teste@orcamento.local"

export const e2eGerentePassword =
  process.env.PLAYWRIGHT_TEST_PASSWORD ?? "playwright123"
