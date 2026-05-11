<<<<<<< HEAD
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = "Carregando..." }: LoadingStateProps) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{message}</span>
      </div>
    </div>
  )
=======
type LoadingStateProps = {
  message?: string
}

export function LoadingState({ message = 'Carregando...' }: LoadingStateProps) {
  return <div className="card-body-muted">{message}</div>
>>>>>>> 310ef08 (deploy)
}
