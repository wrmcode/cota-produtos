"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Maximize2, Search, Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ColumnsToggle } from "@/components/columns-toggle";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate, percentDiff } from "@/lib/format";
import type { RankingGroup } from "@/lib/queries/customer";
import { useColumns } from "@/lib/use-columns";
import { cn } from "@/lib/utils";

export function RankingList({
  groups,
  single = false,
}: {
  groups: RankingGroup[];
  /** Exibindo um único produto (clique em "ver só este"): sempre aberto. */
  single?: boolean;
}) {
  // Acordeão: só um card aberto por vez. Em modo `single` o único card fica sempre aberto.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [columns, setColumns] = useColumns("cota:ranking-columns");

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl bg-card ring-1 ring-foreground/5">
        <EmptyState
          icon={Search}
          title="Nenhum produto encontrado"
          description={
            single
              ? "Esse produto não tem mais cotações ativas."
              : "Tente outro termo de busca."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!single && (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-xs text-muted-foreground">
            {groups.length} produto(s)
          </p>
          <ColumnsToggle value={columns} onChange={setColumns} />
        </div>
      )}

      <div
        className={cn(
          "grid items-start gap-3",
          !single && columns === 2 && "md:grid-cols-2",
        )}
      >
        {groups.map((g) => {
          const open = single || openKey === g.key;
          const best = g.rows[0];
          const panelId = `ranking-${g.key}`;
          const hasSavings = g.rows.length > 1 && g.worstPrice > g.bestPrice;
          const showMeta = hasSavings || !single;
          return (
            <section
              key={g.key}
              className={cn(
                "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5 transition-shadow",
                open && "ring-brand/30",
              )}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                disabled={single}
                onClick={() => setOpenKey((k) => (k === g.key ? null : g.key))}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5",
                  !single && "transition-colors hover:bg-muted/50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-base font-semibold">
                    {g.productName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    por {g.unit}
                    {g.category && ` · ${g.category}`} · {g.rows.length}{" "}
                    fornecedor(es)
                  </p>
                </div>

                {best && (
                  <div className="shrink-0 text-right">
                    <p className="flex items-center justify-end gap-1 font-semibold text-brand tabular-nums">
                      <Trophy className="size-3.5" />
                      {formatBRL(best.price)}
                    </p>
                    <p className="max-w-36 truncate text-xs text-muted-foreground">
                      {best.supplier_name}
                    </p>
                  </div>
                )}

                {!single && (
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      open && "rotate-180",
                    )}
                  />
                )}
              </button>

              {open && (
                <div id={panelId} className="border-t">
                  {showMeta && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-5">
                      {hasSavings ? (
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-brand-soft text-brand"
                        >
                          economia até {formatBRL(g.worstPrice - g.bestPrice)}
                        </Badge>
                      ) : (
                        <span />
                      )}
                      {!single && (
                        <Link
                          href={{
                            pathname: "/cliente",
                            query: { produto: g.key },
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          <Maximize2 className="size-3" />
                          Ver só este produto
                        </Link>
                      )}
                    </div>
                  )}

                  <ol className={cn("divide-y", showMeta && "border-t")}>
                    {g.rows.map((r) => {
                      const diff = percentDiff(r.price, g.bestPrice);
                      const first = r.position === 1;
                      return (
                        <li
                          key={r.product_id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 sm:px-5",
                            first && "bg-brand-soft/40",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                              first
                                ? "bg-brand text-brand-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {first ? <Trophy className="size-4" /> : r.position}
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={{
                                pathname: "/cliente",
                                query: { fornecedor: r.supplier_id },
                              }}
                              className="block truncate text-sm font-medium hover:underline"
                              title={`Ver lista de ${r.supplier_name}`}
                            >
                              {r.supplier_name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {r.supplier_city ? `${r.supplier_city} · ` : ""}
                              atualizado {formatDate(r.quote_date)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                "font-semibold tabular-nums",
                                first && "text-brand",
                              )}
                            >
                              {formatBRL(r.price)}
                            </p>
                            {diff !== null && diff > 0 && (
                              <p className="text-xs text-muted-foreground tabular-nums">
                                +{diff.toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
