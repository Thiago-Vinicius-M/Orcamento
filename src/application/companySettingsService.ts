import type { UserRole } from '../types/userRole'
import { digitsOnly, isValidCnpj } from '../domain/empresa/cnpj'
import type { CompanySettingsRow } from '../repositories/companySettingsRepository'
import {
  removeCompanyLogoPaths,
  updateCompanySettings,
  uploadCompanyLogo,
} from '../repositories/companySettingsRepository'

const ERRO_SOMENTE_GERENTE_SALVAR = 'Apenas gerentes podem alterar os dados da empresa.'
const ERRO_SOMENTE_GERENTE_LOGO = 'Apenas gerentes podem enviar a logo da empresa.'
const ERRO_RAZAO_SOCIAL = 'Informe a razão social da empresa.'
const ERRO_CNPJ_INCOMPLETO = 'CNPJ incompleto. Informe 14 dígitos ou deixe em branco.'
const ERRO_CNPJ_INVALIDO = 'CNPJ inválido.'
const ERRO_MAX_DESCONTO_VENDEDOR_INTERVALO =
  'O máximo de desconto do vendedor deve estar entre 0 e 100% ou ficar em branco (sem limite).'
const ERRO_MAX_DESCONTO_VENDEDOR_NUMERO = 'Informe um número válido para o máximo de desconto do vendedor.'

export function requireGerenteForCompanySettingsSave(role: UserRole | null): void {
  if (role !== 'gerente') {
    throw new Error(ERRO_SOMENTE_GERENTE_SALVAR)
  }
}

export function requireGerenteForCompanyLogoUpload(role: UserRole | null): void {
  if (role !== 'gerente') {
    throw new Error(ERRO_SOMENTE_GERENTE_LOGO)
  }
}

function normalizeRazaoSocialParaSalvar(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') {
    throw new Error(ERRO_RAZAO_SOCIAL)
  }
  return trimmed
}

/** Vazio → `null`; caso contrário exatamente 14 dígitos válidos. */
function normalizeCnpjParaPersistencia(cnpjInput: string): string | null {
  const digits = digitsOnly(cnpjInput)
  if (digits.length === 0) {
    return null
  }
  if (digits.length !== 14) {
    throw new Error(ERRO_CNPJ_INCOMPLETO)
  }
  if (!isValidCnpj(digits)) {
    throw new Error(ERRO_CNPJ_INVALIDO)
  }
  return digits
}

/** Vazio → `null`; caso contrário valor finito em [0, 100] com até 2 casas decimais. */
function normalizeMaxDescontoVendedorPercentualParaPersistencia(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return null
  }
  const normalized = trimmed.replace(',', '.')
  const n = Number(normalized)
  if (!Number.isFinite(n)) {
    throw new Error(ERRO_MAX_DESCONTO_VENDEDOR_NUMERO)
  }
  if (n < 0 || n > 100) {
    throw new Error(ERRO_MAX_DESCONTO_VENDEDOR_INTERVALO)
  }
  return Math.round(n * 100) / 100
}

export type SaveCompanySettingsInput = {
  role: UserRole | null
  companyId: string
  /** Linha atual (`getCompanySettingsRow`) — precisa de `id` e `logo_url` para path anterior. */
  companyRow: Pick<CompanySettingsRow, 'id' | 'logo_url'>
  razao_social: string
  cnpjInput: string
  /** Texto do campo; vazio = sem limite (`null` no banco). */
  maxDescontoVendedorPercentualInput: string
  /** Se definido, faz upload antes do `update` e persiste o novo path. */
  newLogoFile?: File | null
  /**
   * Após upload bem-sucedido com path diferente do anterior, remove o objeto antigo no Storage.
   * Default: `true`.
   */
  removePreviousLogoFromStorage?: boolean
}

/**
 * Valida papel (gerente), normaliza razão social e CNPJ, envia logo quando houver arquivo novo
 * e atualiza `companies`. Opcionalmente remove a logo antiga no bucket.
 */
export async function saveCompanySettings(input: SaveCompanySettingsInput): Promise<void> {
  requireGerenteForCompanySettingsSave(input.role)

  const razao_social = normalizeRazaoSocialParaSalvar(input.razao_social)
  const cnpj = normalizeCnpjParaPersistencia(input.cnpjInput)
  const max_desconto_vendedor_percentual = normalizeMaxDescontoVendedorPercentualParaPersistencia(
    input.maxDescontoVendedorPercentualInput,
  )

  const removePrevious = input.removePreviousLogoFromStorage !== false
  const previousPath = input.companyRow.logo_url?.trim() ?? ''
  let logo_url: string | null = previousPath === '' ? null : previousPath

  const file = input.newLogoFile
  if (file != null && file.size > 0) {
    requireGerenteForCompanyLogoUpload(input.role)
    logo_url = await uploadCompanyLogo(file, input.companyId)
  }

  await updateCompanySettings(input.companyRow.id, {
    razao_social,
    cnpj,
    logo_url,
    max_desconto_vendedor_percentual,
  })

  if (
    removePrevious &&
    file != null &&
    file.size > 0 &&
    previousPath !== '' &&
    logo_url != null &&
    previousPath !== logo_url
  ) {
    try {
      await removeCompanyLogoPaths([previousPath])
    } catch {
      // Registro já aponta para a logo nova; falha ao limpar objeto antigo não reverte o save.
    }
  }
}

export type UploadCompanyLogoAsGerenteInput = {
  role: UserRole | null
  companyId: string
  file: File
}

/** Upload isolado com checagem explícita de gerente (defesa em profundidade). */
export async function uploadCompanyLogoAsGerente(
  input: UploadCompanyLogoAsGerenteInput,
): Promise<string> {
  requireGerenteForCompanyLogoUpload(input.role)
  return uploadCompanyLogo(input.file, input.companyId)
}
