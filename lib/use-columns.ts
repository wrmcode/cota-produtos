"use client";

import { useSyncExternalStore } from "react";

export type Columns = 1 | 2;

// Mini-store por chave para a preferência de colunas de uma lista: lê do
// localStorage sem efeitos (useSyncExternalStore) e mantém cópia em memória
// caso o storage esteja indisponível.
const memory = new Map<string, Columns>();
const listeners = new Map<string, Set<() => void>>();

function read(key: string): Columns {
  const m = memory.get(key);
  if (m) return m;
  try {
    return window.localStorage.getItem(key) === "2" ? 2 : 1;
  } catch {
    return 1;
  }
}

/** Preferência de 1 ou 2 colunas (só em telas largas), lembrada no navegador por `key`. */
export function useColumns(key: string): [Columns, (c: Columns) => void] {
  const subscribe = (cb: () => void) => {
    const set = listeners.get(key) ?? new Set<() => void>();
    set.add(cb);
    listeners.set(key, set);
    return () => {
      set.delete(cb);
    };
  };
  const columns = useSyncExternalStore<Columns>(
    subscribe,
    () => read(key),
    () => 1,
  );
  const setColumns = (c: Columns) => {
    memory.set(key, c);
    try {
      window.localStorage.setItem(key, String(c));
    } catch {
      /* storage indisponível: fica só em memória */
    }
    listeners.get(key)?.forEach((l) => l());
  };
  return [columns, setColumns];
}
