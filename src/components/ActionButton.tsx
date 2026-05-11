import type { ReactNode, ButtonHTMLAttributes } from 'react'

type ActionButtonVariant = 'primary' | 'success' | 'danger' | 'warning' | 'outline-danger'

const VARIANT_STYLES: Record<ActionButtonVariant, React.CSSProperties> = {
  primary: {
    border: 'none',
    background: 'var(--accent-blue)',
    color: '#fff',
  },
  success: {
    border: 'none',
    background: 'var(--accent-green)',
    color: '#fff',
  },
  danger: {
    border: 'none',
    background: 'var(--accent-red)',
    color: '#fff',
  },
  warning: {
    border: 'none',
    background: 'var(--accent-orange)',
    color: '#fff',
  },
  'outline-danger': {
    border: '1px solid var(--accent-red)',
    background: 'var(--accent-red-soft)',
    color: 'var(--accent-red)',
  },
}

const BASE_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.55rem 1.15rem',
  borderRadius: 'var(--radius-sm)',
  fontWeight: 600,
  fontSize: '0.875rem',
  fontFamily: 'inherit',
}

type ActionButtonProps = {
  variant: ActionButtonVariant
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'>

export function ActionButton({ variant, children, disabled, ...rest }: ActionButtonProps) {
  const style: React.CSSProperties = {
    ...BASE_STYLE,
    ...VARIANT_STYLES[variant],
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }

  return (
    <button type="button" disabled={disabled} style={style} {...rest}>
      {children}
    </button>
  )
}
