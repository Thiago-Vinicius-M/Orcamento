import type { CSSProperties, KeyboardEvent } from 'react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { matchesSearch, normalizeSearchQuery } from '../lib/searchNormalize'

export type SearchableSelectOption = {
  value: string
  label: string
  searchText: string
}

type SearchableSelectPropsBase = {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  id: string
  placeholder?: string
  emptySelectionLabel?: string
  disabled?: boolean
  required?: boolean
}

type WithVisibleLabel = SearchableSelectPropsBase & {
  label: string
  ariaLabel?: undefined
}

type WithAriaOnlyLabel = SearchableSelectPropsBase & {
  ariaLabel: string
  label?: undefined
}

export type SearchableSelectProps = WithVisibleLabel | WithAriaOnlyLabel

const liveRegionStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  id,
  label,
  ariaLabel,
  placeholder,
  emptySelectionLabel,
  disabled,
  required,
}: SearchableSelectProps) {
  const reactId = useId()
  const listboxId = `${id}-listbox-${reactId.replace(/:/g, '')}`
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  )

  const filtered = useMemo(
    () => options.filter((o) => matchesSearch(o.searchText, query)),
    [options, query],
  )

  const inputPlaceholder =
    placeholder ?? (value === '' ? emptySelectionLabel : undefined)

  const displayValue = open ? query : (selected?.label ?? '')

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      const el = wrapRef.current
      if (el && !el.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open, close])

  const commitSelection = useCallback(
    (nextValue: string) => {
      onValueChange(nextValue)
      close()
      inputRef.current?.focus()
    },
    [close, onValueChange],
  )

  const optionDomId = useCallback(
    (optValue: string) =>
      `${id}-opt-${optValue.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    [id],
  )

  const moveActive = useCallback(
    (delta: number) => {
      const len = filtered.length
      if (len === 0) return
      setActiveIndex((prev) => {
        if (prev < 0) return delta > 0 ? 0 : len - 1
        return (prev + delta + len) % len
      })
    },
    [filtered],
  )

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        if (!open) {
          setOpen(true)
          setQuery('')
          setActiveIndex(0)
        } else moveActive(1)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        if (!open) {
          setOpen(true)
          setQuery('')
          setActiveIndex(filtered.length > 0 ? filtered.length - 1 : -1)
        } else moveActive(-1)
        break
      }
      case 'Enter': {
        e.preventDefault()
        if (!open) {
          setOpen(true)
          setQuery('')
          return
        }
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          commitSelection(filtered[activeIndex].value)
        }
        break
      }
      case 'Escape': {
        e.preventDefault()
        close()
        inputRef.current?.focus()
        break
      }
      case 'Tab':
        close()
        break
      default:
        break
    }
  }

  const comboboxAriaLabel = label ? undefined : ariaLabel

  const activeDescendantId =
    open && activeIndex >= 0 && activeIndex < filtered.length
      ? optionDomId(filtered[activeIndex].value)
      : undefined

  const noResults =
    open && filtered.length === 0 && normalizeSearchQuery(query) !== ''

  const control = (
    <div ref={wrapRef} className="searchable-select-wrap">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeDescendantId}
        aria-required={required || undefined}
        aria-label={comboboxAriaLabel}
        disabled={disabled}
        className="input-control"
        value={displayValue}
        placeholder={inputPlaceholder}
        autoComplete="off"
        onChange={(e) => {
          if (disabled) return
          const v = e.target.value
          if (!open) setOpen(true)
          setQuery(v)
          setActiveIndex(-1)
        }}
        onFocus={() => {
          if (disabled) return
          setOpen(true)
          setQuery('')
          setActiveIndex(-1)
        }}
        onBlur={() => {
          // Deixa o mousedown na opção rodar antes de fechar
          window.setTimeout(() => {
            if (!wrapRef.current?.contains(document.activeElement)) {
              close()
            }
          }, 0)
        }}
        onKeyDown={onInputKeyDown}
      />

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="searchable-select-panel"
        >
          {filtered.map((opt, index) => {
            const oid = optionDomId(opt.value)
            const isActive = index === activeIndex
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                id={oid}
                role="option"
                aria-selected={isSelected}
                className="searchable-select-option"
                data-active={isActive ? 'true' : undefined}
                onMouseDown={(e) => {
                  e.preventDefault()
                  commitSelection(opt.value)
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {opt.label}
              </div>
            )
          })}
        </div>
      )}

      <span role="status" aria-live="polite" style={liveRegionStyle}>
        {noResults ? 'Nenhum resultado' : ''}
      </span>
    </div>
  )

  if (label) {
    return (
      <div className="form-row">
        <label htmlFor={id}>{label}</label>
        {control}
      </div>
    )
  }

  return control
}
