/**
 * Case-insensitive substring check for search/filter.
 */
export function textIncludes(text: string, query: string): boolean {
  if (!query.trim()) return true
  return text.toLowerCase().includes(query.toLowerCase())
}
