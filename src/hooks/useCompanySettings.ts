import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthSession } from '../auth/useAuthSession'
import { saveCompanySettings } from '../application/companySettingsService'
import { formatCnpjMask } from '../domain/empresa/cnpj'
import { resolveCompanyLogoSignedUrl, toCompanyLogoPath } from '../domain/empresa/companyLogo'
import type { CompanySettingsRow } from '../repositories/companySettingsRepository'
import { getCompanySettingsRow } from '../repositories/companySettingsRepository'
import { useAsyncEffect } from './useAsyncEffect'
import { supabase, supabaseConfigured, SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'

const SIGNED_LOGO_TTL_SECONDS = 3600

export type CompanySettingsMode = 'view' | 'edit'

type CompanySettingsSnapshot = {
  razao_social: string
  cnpjInput: string
  logo_url: string | null
  /** Texto do campo; vazio = sem limite (`null` no banco). */
  maxDescontoVendedorPercentualInput: string
}

type CompanySettingsDraft = CompanySettingsSnapshot & {
  pendingLogoFile: File | null
}

function percentRowToInput(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) {
    return ''
  }
  const rounded = Math.round(v * 100) / 100
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

function rowToSnapshot(row: CompanySettingsRow): CompanySettingsSnapshot {
  return {
    razao_social: row.razao_social?.trim() ?? '',
    cnpjInput: formatCnpjMask(row.cnpj ?? ''),
    logo_url: row.logo_url?.trim() ? row.logo_url.trim() : null,
    maxDescontoVendedorPercentualInput: percentRowToInput(row.max_desconto_vendedor_percentual),
  }
}

function normalizeLogoPath(path: string | null | undefined): string | null {
  const t = path?.trim() ?? ''
  return t === '' ? null : t
}

function snapshotsEqualTextAndLogo(a: CompanySettingsSnapshot, b: CompanySettingsSnapshot): boolean {
  return (
    a.razao_social.trim() === b.razao_social.trim() &&
    a.cnpjInput.replace(/\D/g, '') === b.cnpjInput.replace(/\D/g, '') &&
    normalizeLogoPath(a.logo_url) === normalizeLogoPath(b.logo_url) &&
    a.maxDescontoVendedorPercentualInput.trim() === b.maxDescontoVendedorPercentualInput.trim()
  )
}

export function useCompanySettings() {
  const { user, loading: authLoading, role, companyId } = useAuthSession()
  const isGerente = role === 'gerente'

  const [row, setRow] = useState<CompanySettingsRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<CompanySettingsMode>('view')
  const modeRef = useRef(mode)
  modeRef.current = mode

  const [saved, setSaved] = useState<CompanySettingsSnapshot>(() => ({
    razao_social: '',
    cnpjInput: '',
    logo_url: null,
    maxDescontoVendedorPercentualInput: '',
  }))
  const [draft, setDraft] = useState<CompanySettingsDraft>(() => ({
    razao_social: '',
    cnpjInput: '',
    logo_url: null,
    maxDescontoVendedorPercentualInput: '',
    pendingLogoFile: null,
  }))

  const [signedLogoRefresh, setSignedLogoRefresh] = useState(0)
  const [logoDisplaySrc, setLogoDisplaySrc] = useState<string | null>(null)
  const [logoSrcLoading, setLogoSrcLoading] = useState(false)

  const dirty = useMemo(() => {
    if (draft.pendingLogoFile != null) {
      return true
    }
    return !snapshotsEqualTextAndLogo(saved, draft)
  }, [draft, saved])

  const saveDisabled = saving || !dirty || !isGerente

  useAsyncEffect(
    async ({ cancelled }) => {
      if (!supabaseConfigured) {
        setError(SUPABASE_NOT_CONFIGURED_MESSAGE)
        setLoading(false)
        setRow(null)
        return
      }

      if (authLoading) {
        return
      }

      if (!user) {
        setLoading(false)
        setRow(null)
        const empty: CompanySettingsSnapshot = {
          razao_social: '',
          cnpjInput: '',
          logo_url: null,
          maxDescontoVendedorPercentualInput: '',
        }
        setSaved(empty)
        setDraft({ ...empty, pendingLogoFile: null })
        setMode('view')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await getCompanySettingsRow()
        if (cancelled) return
        setRow(data)
        const snap = rowToSnapshot(data)
        setSaved(snap)
        setDraft((prev) =>
          modeRef.current === 'edit'
            ? prev
            : {
                ...snap,
                pendingLogoFile: null,
              },
        )
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erro ao carregar dados da empresa.')
          setRow(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    },
    [supabaseConfigured, authLoading, user?.id],
  )

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setSignedLogoRefresh((n) => n + 1)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const pathForSignedUrl = useMemo(() => {
    if (draft.pendingLogoFile != null) {
      return null
    }
    if (mode === 'view') {
      return normalizeLogoPath(saved.logo_url)
    }
    return normalizeLogoPath(draft.logo_url)
  }, [draft.pendingLogoFile, draft.logo_url, mode, saved.logo_url])

  useAsyncEffect(
    async ({ cancelled }) => {
      if (!supabaseConfigured || !supabase) {
        if (!cancelled) {
          setLogoDisplaySrc(null)
          setLogoSrcLoading(false)
        }
        return
      }

      if (!pathForSignedUrl) {
        if (!cancelled) {
          setLogoDisplaySrc(null)
          setLogoSrcLoading(false)
        }
        return
      }

      if (!cancelled) {
        setLogoSrcLoading(true)
      }

      try {
        const url = await resolveCompanyLogoSignedUrl(
          supabase,
          toCompanyLogoPath(pathForSignedUrl),
          SIGNED_LOGO_TTL_SECONDS,
        )
        if (!cancelled) {
          setLogoDisplaySrc(url)
        }
      } catch {
        if (!cancelled) {
          setLogoDisplaySrc(null)
        }
      } finally {
        if (!cancelled) {
          setLogoSrcLoading(false)
        }
      }
    },
    [pathForSignedUrl, supabaseConfigured, signedLogoRefresh],
  )

  const previewObjectUrl = useMemo(() => {
    if (!draft.pendingLogoFile) {
      return null
    }
    return URL.createObjectURL(draft.pendingLogoFile)
  }, [draft.pendingLogoFile])

  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl)
      }
    }
  }, [previewObjectUrl])

  const effectiveLogoSrc = previewObjectUrl ?? logoDisplaySrc

  const beginEdit = useCallback(() => {
    if (!row) return
    setMode('edit')
    setDraft({ ...saved, pendingLogoFile: null })
  }, [row, saved])

  const cancelEdit = useCallback(() => {
    setMode('view')
    setDraft({ ...saved, pendingLogoFile: null })
  }, [saved])

  const updateDraft = useCallback(
    (
      patch: Partial<
        Pick<CompanySettingsDraft, 'razao_social' | 'cnpjInput' | 'maxDescontoVendedorPercentualInput'>
      >,
    ) => {
      setDraft((prev) => {
        if (modeRef.current !== 'edit') {
          return prev
        }
        return { ...prev, ...patch }
      })
    },
    [],
  )

  const pickLogo = useCallback((file: File) => {
    if (!isGerente) {
      return
    }
    if (!file || file.size === 0) {
      return
    }
    setDraft((prev) => ({
      ...prev,
      pendingLogoFile: file,
    }))
  }, [isGerente])

  const clearPendingLogo = useCallback(() => {
    if (!isGerente) {
      return
    }
    setDraft((prev) => ({ ...prev, pendingLogoFile: null }))
  }, [isGerente])

  const save = useCallback(async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!row || !dirty || !isGerente) {
      return { ok: false, message: 'Nada a salvar ou sem permissão.' }
    }
    if (!companyId) {
      const message = 'Sessão sem empresa. Faça login novamente.'
      setError(message)
      return { ok: false, message }
    }

    setSaving(true)
    setError(null)

    try {
      await saveCompanySettings({
        role,
        companyId,
        companyRow: { id: row.id, logo_url: row.logo_url },
        razao_social: draft.razao_social,
        cnpjInput: draft.cnpjInput,
        maxDescontoVendedorPercentualInput: draft.maxDescontoVendedorPercentualInput,
        newLogoFile: draft.pendingLogoFile,
        removePreviousLogoFromStorage: true,
      })

      const data = await getCompanySettingsRow()
      setRow(data)
      const snap = rowToSnapshot(data)
      setSaved(snap)
      setDraft({ ...snap, pendingLogoFile: null })
      setMode('view')
      setSignedLogoRefresh((n) => n + 1)
      return { ok: true }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Erro ao salvar configurações da empresa.'
      setError(message)
      return { ok: false, message }
    } finally {
      setSaving(false)
    }
  }, [
    row,
    dirty,
    isGerente,
    companyId,
    role,
    draft.razao_social,
    draft.cnpjInput,
    draft.maxDescontoVendedorPercentualInput,
    draft.pendingLogoFile,
  ])

  return {
    row,
    loading,
    saving,
    error,
    mode,
    isGerente,
    saved,
    draft,
    dirty,
    saveDisabled,
    effectiveLogoSrc,
    logoSrcLoading,
    beginEdit,
    cancelEdit,
    save,
    updateDraft,
    pickLogo,
    clearPendingLogo,
    supabaseConfigured,
    notConfiguredMessage: SUPABASE_NOT_CONFIGURED_MESSAGE,
  }
}
