/** Normaliza texto para busca: sem acentos, minúsculo, espaços colapsados. */
export function normalizeText(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** `true` se todas as palavras da busca aparecem em algum dos campos. */
export function matchesSearch(query: string, fields: Array<string | null | undefined>): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  const haystack = fields.map(normalizeText).join(" ");
  return q.split(" ").every((word) => haystack.includes(word));
}
