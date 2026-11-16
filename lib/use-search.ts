"use client";

import { useMemo, useState } from "react";
import { matchesSearch } from "@/lib/search";

/**
 * Filtro de texto no cliente para listas já carregadas.
 * `getFields` devolve os textos de cada item em que a busca procura.
 */
export function useSearch<T>(items: T[], getFields: (item: T) => Array<string | null | undefined>) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => (query.trim() ? items.filter((item) => matchesSearch(query, getFields(item))) : items),
    // getFields é estável por construção (função inline sem dependências externas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, query],
  );
  return { query, setQuery, filtered };
}
