import type { ReactNode } from 'react'

export type StatusPillVariant = 'success' | 'warning' | 'danger' | 'muted'

type StatusPillProps = {
  variant?: StatusPillVariant
  children: ReactNode
}

export function StatusPill({ variant, children }: StatusPillProps) {
  const className = variant
    ? `status-pill status-${variant}`
    : 'status-pill'

  return <span className={className}>{children}</span>
}
