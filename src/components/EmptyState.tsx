type EmptyStateProps = {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return <div className="card-body-muted">{message}</div>
}
