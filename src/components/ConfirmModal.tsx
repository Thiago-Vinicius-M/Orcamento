import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'

export interface ConfirmOptions {
  title: string
  message: string
  variant?: 'danger' | 'warning' | 'info'
  confirmLabel?: string
  cancelLabel?: string
}

interface ModalState {
  isOpen: boolean
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

const VARIANT_ICONS: Record<NonNullable<ConfirmOptions['variant']>, ReactElement> = {
  danger: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  warning: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

const EMPTY_RESOLVE = () => {}
const DEFAULT_OPTIONS: ConfirmOptions = { title: '', message: '' }

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({
    isOpen: false,
    options: DEFAULT_OPTIONS,
    resolve: EMPTY_RESOLVE,
  })

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ isOpen: true, options, resolve })
    })
  }, [])

  function handleClose(confirmed: boolean) {
    state.resolve(confirmed)
    setState((s) => ({ ...s, isOpen: false }))
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.isOpen && createPortal(<ConfirmModal options={state.options} onClose={handleClose} />, document.body)}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

function ConfirmModal({
  options,
  onClose,
}: {
  options: ConfirmOptions
  onClose: (confirmed: boolean) => void
}) {
  const { title, message, variant = 'danger', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' } = options
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const titleId = 'confirm-modal-title'
  const descId = 'confirm-modal-desc'

  useEffect(() => {
    cancelRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose(false)
        return
      }
      if (e.key === 'Tab') {
        const focusable = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[]
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="confirm-overlay"
      onClick={() => onClose(false)}
      aria-hidden="false"
    >
      <div
        className={`confirm-modal confirm-modal--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-modal__icon confirm-modal__icon--${variant}`}>
          {VARIANT_ICONS[variant]}
        </div>
        <h2 id={titleId} className="confirm-modal__title">
          {title}
        </h2>
        <p id={descId} className="confirm-modal__message">
          {message}
        </p>
        <div className="confirm-modal__actions">
          <button
            ref={cancelRef}
            type="button"
            className="confirm-modal__btn confirm-modal__btn--cancel"
            onClick={() => onClose(false)}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`confirm-modal__btn confirm-modal__btn--confirm confirm-modal__btn--confirm-${variant}`}
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
