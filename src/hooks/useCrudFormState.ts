import { useState } from 'react'

type FormWithOptionalId = {
  id?: string
}

type CreateInitialForm<TForm> = () => TForm

export function useCrudFormState<TForm extends FormWithOptionalId>(
  createInitialForm: CreateInitialForm<TForm>,
) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TForm>(createInitialForm)

  function resetForm() {
    setForm(createInitialForm())
  }

  function closeForm() {
    resetForm()
    setShowForm(false)
  }

  function handleNovo() {
    resetForm()
    setShowForm(true)
  }

  return {
    showForm,
    setShowForm,
    form,
    setForm,
    isEdit: Boolean(form.id),
    resetForm,
    closeForm,
    handleNovo,
  }
}
