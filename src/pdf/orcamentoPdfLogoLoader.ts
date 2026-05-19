import { getCachedLogo, setCachedLogo } from "./PdfAssetCache";

export type LogoImageData = { bytes: Uint8Array; format: 'png' | 'jpg' }

function detectFormat(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png'
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg'
  }
  return null
}

function decodeDataUrl(url: string): LogoImageData | null {
  const match = url.match(/^data:image\/(png|jpe?g);base64,(.+)$/i)
  if (!match) return null
  const format = match[1]!.toLowerCase().startsWith('p') ? 'png' : 'jpg'
  try {
    const binary = atob(match[2]!)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return { bytes, format }
  } catch {
    return null
  }
}

/**
 * Carrega bytes de imagem para embed no PDF.
 * Suporta PNG e JPEG via URL ou data URL.
 * Retorna null para WebP (não suportado pelo pdf-lib), erros ou URL ausente.
 */
export async function loadLogoForPdf(
  url: string | null | undefined,
): Promise<LogoImageData | null> {
  if (!url || url.trim() === '') return null

  const cached = getCachedLogo(url);
  if (cached !== undefined) return cached;

  let result: LogoImageData | null = null;

  if (url.startsWith('data:')) {
    result = decodeDataUrl(url);
  } else {
    try {
      const res = await fetch(url)
      if (!res.ok) {
        result = null;
      } else {
        const buffer = await res.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        const format = detectFormat(bytes)
        if (!format) {
          console.warn('[PDF logo] Formato não suportado (apenas PNG e JPEG). Logo ignorada.')
          result = null;
        } else {
          result = { bytes, format };
        }
      }
    } catch {
      result = null;
    }
  }

  setCachedLogo(url, result);
  return result;
}
