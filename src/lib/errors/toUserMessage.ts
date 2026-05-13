/**
 * Mensagem segura para exibir ao usuário a partir de um valor desconhecido (ex.: `catch`).
 */
export function toUserMessage(err: unknown, fallbackMessage: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallbackMessage
}
