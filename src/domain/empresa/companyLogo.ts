import type { SupabaseClient } from '@supabase/supabase-js'

/** Bucket privado das logos; paths são relativos a ele. */
export const COMPANY_LOGOS_BUCKET = 'company-logos' as const

/**
 * Caminho do objeto no Storage (ex. `{companyId}/{uuid}.webp`).
 * A coluna `companies.logo_url` persiste **somente** este path, nunca URL absoluta/CDN.
 */
export type CompanyLogoPath = string & { readonly __brand: 'CompanyLogoPath' }

/** Valor da coluna `companies.logo_url` no banco. */
export type CompanyLogoColumnValue = CompanyLogoPath | null

function isBlankPath(path: string | null | undefined): path is null | undefined | '' {
  return path == null || path.trim() === ''
}

function looksLikeAbsoluteUrl(path: string): boolean {
  const t = path.trim().toLowerCase()
  return t.startsWith('http://') || t.startsWith('https://')
}

/**
 * Marca string como path de logo (uso ao ler `logo_url` ou após upload).
 * Não valida formato; RLS e prefixo da empresa garantem acesso no Storage.
 */
export function toCompanyLogoPath(path: string): CompanyLogoPath {
  return path as CompanyLogoPath
}

/**
 * Resolve URL assinada para exibir a logo na UI ou embedar no futuro (ex. PDF).
 *
 * @param path — valor de `companies.logo_url` (path no bucket) ou equivalente
 * @param expiresIn — TTL em **segundos** (`StorageApi.createSignedUrl`)
 * @returns `null` se não houver path; URL assinada em caso de sucesso
 */
export async function resolveCompanyLogoSignedUrl(
  supabase: SupabaseClient,
  path: CompanyLogoPath | null | undefined,
  expiresIn: number,
): Promise<string | null> {
  if (isBlankPath(path)) {
    return null
  }

  const trimmed = path.trim()
  if (looksLikeAbsoluteUrl(trimmed)) {
    throw new Error(
      'logo_url deve armazenar apenas o path no bucket company-logos, não URL absoluta.',
    )
  }

  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error('expiresIn deve ser um número finito positivo (segundos).')
  }

  const { data, error } = await supabase.storage
    .from(COMPANY_LOGOS_BUCKET)
    .createSignedUrl(trimmed, expiresIn)

  if (error) {
    throw new Error(error.message)
  }

  const signedUrl = data?.signedUrl
  return signedUrl ?? null
}
