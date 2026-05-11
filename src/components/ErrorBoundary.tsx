import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__icon">!</div>
        <h2>Algo deu errado</h2>
        <p className="text-muted">
          Ocorreu um erro inesperado. Tente recarregar a página ou voltar ao início.
        </p>
        {this.state.error && (
          <details className="error-boundary__details">
            <summary>Detalhes técnicos</summary>
            <pre>{this.state.error.message}</pre>
          </details>
        )}
        <div className="error-boundary__actions">
          <button type="button" className="btn-primary" onClick={this.handleReset}>
            Tentar novamente
          </button>
          <a href="/" className="btn-secondary">
            Voltar ao início
          </a>
        </div>
      </div>
    )
  }
}
