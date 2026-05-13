import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getPreferredLoginPath } from './preferredLogin'
import { useAuthSession } from './useAuthSession'

type RequireAuthProps = {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const { user, loading, error } = useAuthSession()

  if (loading) {
    return <div style={{ padding: '1rem' }}>Carregando...</div>
  }

  if (!user) {
    return (
      <>
        {error ? (
          <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>{error}</p>
        ) : null}
        <Navigate
          to={getPreferredLoginPath()}
          replace
          state={{ from: location.pathname }}
        />
      </>
    )
  }

  return <>{children}</>
}
