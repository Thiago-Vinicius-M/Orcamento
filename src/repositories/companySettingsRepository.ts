import { repositoryErrorText, translatePermissionDenied } from '../lib/errors'
import { getDefaultSupabase } from '../lib/supabaseClient'

/** Bucket privado; `logo_url` em `companies` guarda só o path relativo a este bucket. */
export const COMPANY_LOGOS_BUCKET_ID = 'company-logos' as const

/** Alinhado a `file_size_limit` do bucket na migration (2 MiB). */
export const COMPANY_LOGO_MAX_FILE_BYTES = 2_097_152 as const

/** Caminho do objeto no Storage (ex.: `{company_id}/{uuid}.webp`), nunca URL absoluta. */
export type CompanyLogoPath = string

export type CompanySettingsRow = {
  id: string
  login_code: string
  razao_social: string | null
  cnpj: string | null
  logo_url: string | null
  /** `null` = sem teto; caso contrário teto em % (0–100). */
  max_desconto_vendedor_percentual: number | null
}

export type CompanySettingsUpdatePayload = {
  razao_social: string
  cnpj: string | null
  logo_url: string | null
  max_desconto_vendedor_percentual: number | null
}

const COMPANY_SETTINGS_SELECT =
  'id, login_code, razao_social, cnpj, logo_url, max_desconto_vendedor_percentual' as const

const ERRO_CARREGAR = 'Não foi possível carregar os dados da empresa.'
const ERRO_ATUALIZAR = 'Não foi possível atualizar os dados da empresa.'
const ERRO_PERMISSAO_ATUALIZAR = 'Apenas gerentes podem alterar os dados da empresa.'
const ERRO_PERMISSAO_UPLOAD = 'Apenas gerentes podem enviar a logo da empresa.'
const ERRO_UPLOAD = 'Não foi possível enviar a logo.'

function throwUpdateError(err: unknown): never {
  const raw = repositoryErrorText(err)
  const base = raw.trim().length > 0 ? raw : ERRO_ATUALIZAR
  throw new Error(translatePermissionDenied(base, ERRO_PERMISSAO_ATUALIZAR))
}

function throwUploadError(err: unknown): never {
  const raw = repositoryErrorText(err)
  const base = raw.trim().length > 0 ? raw : ERRO_UPLOAD
  throw new Error(translatePermissionDenied(base, ERRO_PERMISSAO_UPLOAD))
}

type NormalizedLogo = { contentType: 'image/png' | 'image/jpeg' | 'image/webp'; ext: string }

function normalizeLogoFile(file: File): NormalizedLogo {
  const raw = file.type.trim().toLowerCase()
  if (raw === 'image/png') {
    return { contentType: 'image/png', ext: 'png' }
  }
  if (raw === 'image/jpeg' || raw === 'image/jpg') {
    return { contentType: 'image/jpeg', ext: 'jpg' }
  }
  if (raw === 'image/webp') {
    return { contentType: 'image/webp', ext: 'webp' }
  }
  throw new Error('Formato de imagem não suportado. Use PNG, JPEG ou WebP.')
}

export async function getCompanySettingsRow(): Promise<CompanySettingsRow> {
  const supabase = getDefaultSupabase()
  const { data, error } = await supabase
    .from('companies')
    .select(COMPANY_SETTINGS_SELECT)
    .single()

  if (error) {
    const raw = repositoryErrorText(error)
    throw new Error(raw.trim().length > 0 ? raw : ERRO_CARREGAR)
  }

  if (!data) {
    throw new Error(ERRO_CARREGAR)
  }

  return data as CompanySettingsRow
}

/**
 * Atualiza `razao_social`, `cnpj`, `logo_url` (path no bucket ou `null`) e teto de desconto do vendedor.
 * `id` deve ser o da linha atual em `companies` (RLS limita o escopo).
 */
export async function updateCompanySettings(
  companyRowId: string,
  payload: CompanySettingsUpdatePayload,
): Promise<void> {
  const supabase = getDefaultSupabase()
  const { error } = await supabase
    .from('companies')
    .update({
      razao_social: payload.razao_social,
      cnpj: payload.cnpj,
      logo_url: payload.logo_url,
      max_desconto_vendedor_percentual: payload.max_desconto_vendedor_percentual,
    })
    .eq('id', companyRowId)

  if (error) {
    throwUpdateError(error)
  }
}

/**
 * Envia a imagem para `company-logos/{companyId}/{uuid}.{ext}`.
 * Retorna o path a persistir em `companies.logo_url`.
 */
export async function uploadCompanyLogo(file: File, companyId: string): Promise<CompanyLogoPath> {
  if (!file || file.size === 0) {
    throw new Error('Selecione um arquivo de imagem válido.')
  }
  if (file.size > COMPANY_LOGO_MAX_FILE_BYTES) {
    throw new Error('A imagem deve ter no máximo 2 MB.')
  }

  const { contentType, ext } = normalizeLogoFile(file)
  const supabase = getDefaultSupabase()
  const path = `${companyId}/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from(COMPANY_LOGOS_BUCKET_ID)
    .upload(path, file, {
      contentType,
      upsert: false,
    })

  if (error) {
    throwUploadError(error)
  }

  if (!data?.path) {
    throw new Error(ERRO_UPLOAD)
  }

  return data.path
}

/**
 * Remove objetos do bucket `company-logos` pelos paths informados.
 * Ignora paths vazios; falhas de permissão usam a mesma mensagem de upload.
 */
export async function removeCompanyLogoPaths(paths: string[]): Promise<void> {
  const unique = [...new Set(paths.map((p) => p.trim()).filter((p) => p.length > 0))]
  if (unique.length === 0) {
    return
  }

  const supabase = getDefaultSupabase()
  const { error } = await supabase.storage.from(COMPANY_LOGOS_BUCKET_ID).remove(unique)

  if (error) {
    throwUploadError(error)
  }
}
