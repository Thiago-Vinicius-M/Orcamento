type LoadingStateProps = {
  message?: string
}

export function LoadingState({ message = 'Carregando...' }: LoadingStateProps) {
  return <div className="card-body-muted">{message}</div>
}
