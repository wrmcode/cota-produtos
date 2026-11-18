"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SUPPLIER_TYPES } from "@/types/schemas";

export const ALL_SEGMENTS = "";
const OTHER = "Outro";

/** Segmento de um fornecedor: o tipo cadastrado, ou "Outro" quando vazio. */
const segmentOf = (type: string | null | undefined) => type?.trim() || OTHER;

const order = (s: string) => {
  const i = (SUPPLIER_TYPES as readonly string[]).indexOf(s);
  return i === -1 ? SUPPLIER_TYPES.length - 1.5 : i; // tipos fora da lista ficam antes de "Outro"
};

/**
 * Filtra uma lista de fornecedores por segmento (supplier_type).
 * Devolve só os segmentos presentes, na ordem de SUPPLIER_TYPES, com a contagem de cada um.
 */
export function useSegmentFilter<T extends { supplier_type: string | null }>(items: T[]) {
  const [segment, setSegment] = useState<string>(ALL_SEGMENTS);

  const segments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const s = segmentOf(item.supplier_type);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);

  // Segmento escolhido sumiu da lista (ex.: dados atualizados): volta para "Todos"
  const active = segment && segments.some((s) => s.name === segment) ? segment : ALL_SEGMENTS;

  const bySegment = useMemo(
    () => (active ? items.filter((item) => segmentOf(item.supplier_type) === active) : items),
    [items, active],
  );

  return { segment: active, setSegment, segments, bySegment };
}

/** Chips roláveis com os segmentos: "Todos" + um por tipo de fornecedor presente. */
export function SegmentFilter({
  segments,
  value,
  onChange,
  total,
  className,
}: {
  segments: { name: string; count: number }[];
  value: string;
  onChange: (segment: string) => void;
  total: number;
  className?: string;
}) {
  if (segments.length < 2) return null;
  const options = [{ name: ALL_SEGMENTS, label: "Todos", count: total }, ...segments.map((s) => ({ ...s, label: s.name }))];

  return (
    <div
      role="group"
      aria-label="Filtrar por segmento"
      className={cn("-mx-1 -my-1 flex gap-1.5 overflow-x-auto px-1 py-1.5 [scrollbar-width:thin]", className)}
    >
      {options.map((o) => {
        const selected = value === o.name;
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.name)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-brand text-white ring-brand"
                : "bg-card text-muted-foreground ring-foreground/10 hover:bg-muted hover:text-foreground",
            )}
          >
            {o.label}
            <span className={cn("tabular-nums", selected ? "text-white/80" : "text-muted-foreground/70")}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}
