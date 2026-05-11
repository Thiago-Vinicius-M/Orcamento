import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";

const REGULAR_URL = new URL("../assets/fonts/Roboto-Regular.ttf", import.meta.url);
const BOLD_URL = new URL("../assets/fonts/Roboto-Bold.ttf", import.meta.url);

async function loadFontFile(url: URL): Promise<Uint8Array> {
  if (typeof window !== "undefined") {
    const res = await fetch(url);
    return new Uint8Array(await res.arrayBuffer());
  }
  const { readFile } = await import(/* @vite-ignore */ "node:fs/promises");
  const { fileURLToPath } = await import(/* @vite-ignore */ "node:url");
  return new Uint8Array(await readFile(fileURLToPath(url)));
}

export async function embedPdfFonts(pdfDoc: PDFDocument): Promise<{ fontTitle: PDFFont; fontNormal: PDFFont }> {
  pdfDoc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    loadFontFile(REGULAR_URL), 
    loadFontFile(BOLD_URL)
  ]);
  const fontNormal = await pdfDoc.embedFont(regularBytes);
  const fontTitle = await pdfDoc.embedFont(boldBytes);
  return { fontNormal, fontTitle };
}