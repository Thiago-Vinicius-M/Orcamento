import { formatDate, formatDateFromDate } from "../datas/data";

/** Data de validade exibida no PDF: 30 dias após `criadoEm`, ou fallback formatado. */
export function calcularValidade30Dias(criadoEm: string, fallbackValidadeAte?: string): string {
  const base = new Date(criadoEm);
  if (!Number.isNaN(base.getTime())) {
    const validade = new Date(base);
    validade.setDate(validade.getDate() + 30);
    return formatDateFromDate(validade);
  }
  return fallbackValidadeAte ? formatDate(fallbackValidadeAte) : "";
}
