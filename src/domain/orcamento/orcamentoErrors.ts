export class OrcamentoTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrcamentoTransitionError'
  }
}
