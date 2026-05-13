import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

type LazyRouteProps = {
  fallback: ReactNode
  children: ReactNode
}

export function LazyRoute({ fallback, children }: LazyRouteProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  )
}
