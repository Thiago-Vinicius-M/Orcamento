import type { LogoImageData } from "./orcamentoPdfLogoLoader";

/** Font bytes cache — TTF files never change between requests in the same session. */
const fontBytesCache = new Map<string, Uint8Array>();

export async function getCachedFontBytes(url: URL): Promise<Uint8Array> {
  const key = url.toString();
  const cached = fontBytesCache.get(key);
  if (cached) return cached;

  let bytes: Uint8Array;
  if (typeof window !== "undefined") {
    const res = await fetch(url);
    bytes = new Uint8Array(await res.arrayBuffer());
  } else {
    const { readFile } = await import(/* @vite-ignore */ "node:fs/promises");
    const { fileURLToPath } = await import(/* @vite-ignore */ "node:url");
    bytes = new Uint8Array(await readFile(fileURLToPath(url)));
  }

  fontBytesCache.set(key, bytes);
  return bytes;
}

/** Logo bytes cache — same URL produces the same image bytes within a session. */
const logoBytesCache = new Map<string, LogoImageData | null>();

export function getCachedLogo(url: string): LogoImageData | null | undefined {
  if (!logoBytesCache.has(url)) return undefined;
  return logoBytesCache.get(url)!;
}

export function setCachedLogo(url: string, data: LogoImageData | null): void {
  logoBytesCache.set(url, data);
}
