import { useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, LoadingState, FormField, ActionButton } from '../components'
import { useCompanySettings } from '../hooks/useCompanySettings'

function urlHasAccessToken(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hash.includes('access_token=') || window.location.search.includes('access_token=')
}

export function ConfiguracoesPage() {
  const navigate = useNavigate()
  const [hasTokenInUrl] = useState(urlHasAccessToken)

  const {
    row,
    loading,
    saving,
    error,
    mode,
    isGerente,
    draft,
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
    notConfiguredMessage,
    saved,
  } = useCompanySettings()

  const isEdit = mode === 'edit' && isGerente
  const razaoValue = isEdit ? draft.razao_social : saved.razao_social
  const cnpjValue = isEdit ? draft.cnpjInput : saved.cnpjInput

  useLayoutEffect(() => {
    if (!hasTokenInUrl) return
    navigate(
      {
        pathname: '/auth/confirm-callback',
        search: window.location.search,
        hash: window.location.hash,
      },
      { replace: true },
    )
  }, [hasTokenInUrl, navigate])

  if (hasTokenInUrl) {
    return <LoadingState message="Redirecionando confirmação de e-mail..." />
  }

  async function handleSave() {
    const result = await save()
    if (result.ok) {
      toast.success('Dados da empresa salvos com sucesso.')
    } else if (result.message !== 'Nada a salvar ou sem permissão.') {
      toast.error(result.message)
    }
  }

  const pageError = !supabaseConfigured ? notConfiguredMessage : error

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Dados da empresa e identificação para a equipe."
        error={pageError}
      />

      <div className="page-grid">
        <section className="card">
          <header className="card-header card-header-row">
            <h2>Informações da empresa</h2>
            {isGerente && mode === 'view' && row && (
              <ActionButton type="button" variant="primary" onClick={beginEdit} disabled={loading || saving}>
                Editar
              </ActionButton>
            )}
            {isGerente && mode === 'edit' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <ActionButton type="button" variant="primary" onClick={() => void handleSave()} disabled={saveDisabled}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </ActionButton>
                <ActionButton type="button" variant="warning" onClick={cancelEdit} disabled={saving}>
                  Cancelar
                </ActionButton>
              </div>
            )}
          </header>

          {loading ? (
            <LoadingState message="Carregando dados da empresa..." />
          ) : (
            <div className="form-grid" style={{ paddingTop: '0.25rem' }}>
              <div className="form-row">
                <span className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Logo
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle, #e5e5e5)',
                      background: 'var(--surface-muted, #f5f5f5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {logoSrcLoading && !effectiveLogoSrc ? (
                      <span className="text-sm text-muted">Carregando…</span>
                    ) : effectiveLogoSrc ? (
                      <img src={effectiveLogoSrc} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span className="text-sm text-muted">Sem logo</span>
                    )}
                  </div>
                  {isEdit && (
                    <div className="stack-vertical" style={{ gap: '0.5rem' }}>
                      <label className="btn-secondary" style={{ cursor: saving ? 'not-allowed' : 'pointer', display: 'inline-block' }}>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          disabled={saving}
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) pickLogo(file)
                            e.target.value = ''
                          }}
                        />
                        Escolher imagem
                      </label>
                      {draft.pendingLogoFile && (
                        <button type="button" className="btn-link-danger" disabled={saving} onClick={clearPendingLogo}>
                          Remover seleção
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <FormField
                label="Código da empresa"
                htmlFor="company_login_code"
                inputProps={{
                  type: 'text',
                  value: row?.login_code ?? '',
                  readOnly: true,
                  disabled: true,
                  'aria-readonly': true,
                }}
              />

              <FormField
                label="Razão social *"
                htmlFor="company_razao_social"
                inputProps={{
                  type: 'text',
                  value: razaoValue,
                  readOnly: !isEdit,
                  onChange: (e) => updateDraft({ razao_social: e.target.value }),
                  autoComplete: 'organization',
                }}
              />

              <FormField
                label="CNPJ"
                htmlFor="company_cnpj"
                inputProps={{
                  type: 'text',
                  value: cnpjValue,
                  readOnly: !isEdit,
                  onChange: (e) => updateDraft({ cnpjInput: e.target.value }),
                  placeholder: '00.000.000/0000-00',
                  inputMode: 'numeric',
                  autoComplete: 'off',
                }}
              />

              {isGerente && (
                <FormField
                  label="Máximo desconto de vendedor (%)"
                  htmlFor="company_max_desconto_vendedor"
                  inputProps={{
                    type: 'number',
                    value: isEdit
                      ? draft.maxDescontoVendedorPercentualInput
                      : saved.maxDescontoVendedorPercentualInput,
                    readOnly: !isEdit,
                    onChange: (e) =>
                      updateDraft({ maxDescontoVendedorPercentualInput: e.target.value }),
                    min: 0,
                    max: 100,
                    step: 'any',
                    placeholder: 'Ex.: 7 ou 7,5',
                    inputMode: 'decimal',
                    autoComplete: 'off',
                  }}
                />
              )}

              {!isGerente && (
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  Apenas gerentes podem alterar estes dados. Você pode visualizar as informações da empresa.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
