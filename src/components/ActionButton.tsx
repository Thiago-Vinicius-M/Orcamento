import type { ReactNode, ButtonHTMLAttributes } from 'react'

type ActionButtonVariant = 'primary' | 'success' | 'danger' | 'warning' | 'outline-danger'

const VARIANT_CLASS: Record<ActionButtonVariant, string> = {
  primary: 'btn-action--primary',
  success: 'btn-action--success',
  danger: 'btn-action--danger',
  warning: 'btn-action--warning',
  'outline-danger': 'btn-action--outline-danger',
}

type ActionButtonProps = {
  variant: ActionButtonVariant
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'>

export function ActionButton({ variant, children, disabled, className, ...rest }: ActionButtonProps) {
  const classes = [
    'btn-action',
    VARIANT_CLASS[variant],
    disabled ? 'btn-action--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" disabled={disabled} className={classes} {...rest}>
      {children}
    </button>
  )
}
