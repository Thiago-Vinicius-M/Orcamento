import { useState } from 'react'
import { getErrorMessage } from './authFlow'

type AsyncAction = () => Promise<void>

export function useAuthFlow(defaultErrorMessage: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function clearError() {
    setError(null)
  }

  async function run(action: AsyncAction) {
    setLoading(true)
    try {
      await action()
    } catch (err) {
      setError(getErrorMessage(err, defaultErrorMessage))
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    setError,
    clearError,
    run,
  }
}
