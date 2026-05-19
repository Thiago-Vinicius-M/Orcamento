import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";
import { getCachedFontBytes } from "./PdfAssetCache";

const REGULAR_URL = new URL("../assets/fonts/Roboto-Regular.ttf", import.meta.url);
const BOLD_URL = new URL("../assets/fonts/Roboto-Bold.ttf", import.meta.url);

export async function embedPdfFonts(pdfDoc: PDFDocument): Promise<{ fontTitle: PDFFont; fontNormal: PDFFont }> {
  pdfDoc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    getCachedFontBytes(REGULAR_URL),
    getCachedFontBytes(BOLD_URL),
  ]);
  const fontNormal = await pdfDoc.embedFont(regularBytes);
  const fontTitle = await pdfDoc.embedFont(boldBytes);
  return { fontNormal, fontTitle };
}