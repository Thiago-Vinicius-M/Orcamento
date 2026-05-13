export function formatDateBR(value: string | number | Date): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

/** ISO ou string parseável; se inválida, devolve o texto original. */
export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export function formatDateFromDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}
