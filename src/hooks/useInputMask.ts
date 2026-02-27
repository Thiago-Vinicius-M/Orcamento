import { useCallback, type ChangeEvent } from "react"

type Formatter = (value: string) => string

export function useMaskedChangeHandler(
  formatter: Formatter,
  maxDigits: number,
  onChange: (value: string) => void,
) {
  return useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, maxDigits)
      onChange(raw.length > 0 ? formatter(raw) : "")
    },
    [formatter, maxDigits, onChange],
  )
}
