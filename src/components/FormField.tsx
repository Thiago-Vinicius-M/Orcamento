import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

type BaseProps = {
  label: string
  htmlFor: string
}

type InputFieldProps = BaseProps & {
  as?: 'input'
  inputProps: InputHTMLAttributes<HTMLInputElement>
}

type TextareaFieldProps = BaseProps & {
  as: 'textarea'
  inputProps: TextareaHTMLAttributes<HTMLTextAreaElement>
}

type SelectFieldProps = BaseProps & {
  as: 'select'
  inputProps: SelectHTMLAttributes<HTMLSelectElement>
  children: ReactNode
}

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps

export function FormField(props: FormFieldProps) {
  const { label, htmlFor } = props

  return (
    <div className="form-row">
      <label htmlFor={htmlFor}>{label}</label>
      {props.as === 'textarea' ? (
        <textarea id={htmlFor} {...props.inputProps} />
      ) : props.as === 'select' ? (
        <select id={htmlFor} {...props.inputProps}>
          {props.children}
        </select>
      ) : (
        <input id={htmlFor} {...(props.inputProps ?? {})} />
      )}
    </div>
  )
}
