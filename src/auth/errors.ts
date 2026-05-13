/** Copy estável para erros do fluxo de cadastro de gerente (edge `register-gerente`). */
export function buildRegisterGerenteErrorMessage(rawMessage: string): string {
  const normalized = rawMessage.trim()
  if (!normalized) return 'Falha ao criar conta. Tente novamente em instantes.'

  const lower = normalized.toLowerCase()

  if (lower.includes('database error saving new user')) {
    return (
      'Falha ao criar conta: erro ao salvar usuário no banco durante o onboarding da empresa/perfil. ' +
      `Detalhe técnico: ${normalized}`
    )
  }

  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return `Este e-mail já está cadastrado. Use outro e-mail ou faça login. Detalhe técnico: ${normalized}`
  }

  if (lower.includes('invalid login credentials')) {
    return `Credenciais inválidas para a operação de cadastro. Verifique os dados enviados. Detalhe técnico: ${normalized}`
  }

  return `Falha ao criar conta no serviço de cadastro. Detalhe técnico: ${normalized}`
}
