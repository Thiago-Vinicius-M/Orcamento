import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface EmptyStateProps {
  icon: LucideIcon
  title?: string
  description: string
  action?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <Icon className="mx-auto h-12 w-12 text-muted-foreground/50" />
      {title && (
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      )}
      <p
        className={`text-sm text-muted-foreground ${title ? "mt-1" : "mt-3"}`}
      >
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
