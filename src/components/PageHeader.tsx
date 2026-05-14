import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  error?: string | null
  children?: ReactNode
}

export function PageHeader({ title, subtitle, error, children }: PageHeaderProps) {
  return (
    <>
      <h1>{title}</h1>
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      {error && (
        <div className="page-error" role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      {children}
    </>
  )
}
