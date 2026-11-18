"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  Scale,
  Search,
  Truck,
} from "lucide-react";
import { ColumnsToggle } from "@/components/columns-toggle";
import { SupplierTypeBadge } from "@/components/customer/supplier-info";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { SegmentFilter, useSegmentFilter } from "@/components/segment-filter";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatMinOrder } from "@/lib/format";
import type { SupplierPublic } from "@/lib/queries/customer";
import { useColumns } from "@/lib/use-columns";
import { useSearch } from "@/lib/use-search";
import { cn } from "@/lib/utils";

export interface SupplierCardStats {
  products: number;
  firsts: number;
}

type SortKey = "name-asc" | "name-desc" | "products-desc" | "firsts-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Nome (A–Z)" },
  { value: "name-desc", label: "Nome (Z–A)" },
  { value: "products-desc", label: "Mais produtos cotados" },
  { value: "firsts-desc", label: "Mais vezes com melhor preço" },
];

const collator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});

export function SupplierCards({
  suppliers,
  stats,
}: {
  suppliers: SupplierPublic[];
  stats: Record<string, SupplierCardStats>;
}) {
  const { segment, setSegment, segments, bySegment } = useSegmentFilter(suppliers);
  const { query, setQuery, filtered } = useSearch(bySegment, (s) => [
    s.name,
    s.city,
    s.seller_name,
    s.supplier_type,
  ]);
  // Acordeão: só um fornecedor aberto por vez.
  const [openId, setOpenId] = useState<string | null>(null);
  const [columns, setColumns] = useColumns("cota:suppliers-columns");
  const [sort, setSort] = useState<SortKey>("name-asc");

  const sorted = useMemo(() => {
    const byName = (a: SupplierPublic, b: SupplierPublic) =>
      collator.compare(a.name, b.name);
    const list = [...filtered];
    switch (sort) {
      case "name-desc":
        return list.sort((a, b) => byName(b, a));
      case "products-desc":
        return list.sort(
          (a, b) =>
            (stats[b.id]?.products ?? 0) - (stats[a.id]?.products ?? 0) ||
            byName(a, b),
        );
      case "firsts-desc":
        return list.sort(
          (a, b) =>
            (stats[b.id]?.firsts ?? 0) - (stats[a.id]?.firsts ?? 0) ||
            byName(a, b),
        );
      default:
        return list.sort(byName);
    }
  }, [filtered, sort, stats]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/5 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar fornecedor, cidade ou vendedor…"
          className="sm:max-w-sm"
        />
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="shrink-0 px-1 text-xs text-muted-foreground">
            {filtered.length} de {suppliers.length}
          </p>
          <div className="flex items-center gap-2">
            <NativeSelect
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Ordenar fornecedores"
              className="h-9 w-full sm:w-auto"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
            <ColumnsToggle value={columns} onChange={setColumns} />
          </div>
        </div>
      </div>

      <SegmentFilter segments={segments} value={segment} onChange={setSegment} total={suppliers.length} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-card ring-1 ring-foreground/5">
          <EmptyState
            icon={Search}
            title="Nenhum fornecedor encontrado"
            description={segment ? `Nenhum fornecedor de ${segment} com esse termo. Tente outro termo ou escolha "Todos".` : "Tente outro termo de busca."}
          />
        </div>
      ) : (
        <div
          className={cn(
            "grid items-start gap-3",
            columns === 2 && "md:grid-cols-2",
          )}
        >
          {sorted.map((s) => {
            const st = stats[s.id];
            const open = openId === s.id;
            const panelId = `supplier-${s.id}`;
            return (
              <article
                key={s.id}
                className={cn(
                  "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5",
                  open && "ring-brand/30",
                )}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId((id) => (id === s.id ? null : s.id))}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-base font-semibold">
                        {s.name}
                      </h2>
                      <SupplierTypeBadge type={s.supplier_type} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.city ? `${s.city} · ` : ""}
                      {st?.products ?? 0} produto(s) cotado(s)
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-brand tabular-nums">
                      {st?.firsts ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      melhor preço
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      open && "rotate-180",
                    )}
                  />
                </button>

                {open && (
                  <div
                    id={panelId}
                    className="space-y-4 border-t px-4 py-4 sm:px-5"
                  >
                    <p className="text-sm">
                      <span className="text-muted-foreground">Vendedor: </span>
                      {s.seller_name ?? "—"}
                      {s.seller_whatsapp && (
                        <>
                          {" · "}
                          <WhatsAppLink number={s.seller_whatsapp} />
                        </>
                      )}
                    </p>

                    <ul className="space-y-1.5 text-sm">
                      <li className="flex items-center gap-2">
                        <Scale className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {formatMinOrder(s.min_order_kg, s.min_order_brl)}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CreditCard className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {s.payment_terms ?? "Pagamento a combinar"}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Truck className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {s.delivery_info ?? "Entrega a combinar"}
                        </span>
                      </li>
                    </ul>

                    <div className="flex items-center justify-between gap-3 border-t pt-3">
                      <dl className="flex gap-6 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Produtos cotados
                          </dt>
                          <dd className="font-semibold tabular-nums">
                            {st?.products ?? 0}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Melhor preço em
                          </dt>
                          <dd className="font-semibold tabular-nums">
                            {st?.firsts ?? 0}
                          </dd>
                        </div>
                      </dl>
                      <Button
                        size="sm"
                        render={<Link href={`/cliente?fornecedor=${s.id}`} />}
                      >
                        Ver preços
                        <ArrowRight />
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
