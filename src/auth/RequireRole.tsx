import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useUserRole } from '../hooks/useUserRole'
import type { UserRole } from '../types/userRole'

type RequireRoleProps = {
  allowedRoles: readonly UserRole[]
  children: ReactNode
}

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { role, loading, error } = useUserRole()

  if (loading) {
    return <div style={{ padding: '1rem' }}>Carregando...</div>
  }

  if (error || !role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
