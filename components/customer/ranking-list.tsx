import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate, percentDiff } from "@/lib/format";
import type { RankingGroup } from "@/lib/queries/customer";
import { cn } from "@/lib/utils";

export function RankingList({
  groups,
  emptyIcon,
  single = false,
}: {
  groups: RankingGroup[];
  emptyIcon: LucideIcon;
  /** Exibindo um único produto (clique no card): sem link no título e largura total. */
  single?: boolean;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl bg-card ring-1 ring-foreground/5">
        <EmptyState icon={emptyIcon} title="Nenhum produto encontrado" description={single ? "Esse produto não tem mais cotações ativas." : "Tente outro termo de busca."} />
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", !single && "lg:grid-cols-2")}>
      {groups.map((g) => {
        const title = (
          <>
            <h2 className="font-heading text-base font-semibold">{g.productName}</h2>
            <p className="text-xs text-muted-foreground">
              por {g.unit}
              {g.category && ` · ${g.category}`} · {g.rows.length} fornecedor(es)
            </p>
          </>
        );
        return (
          <section key={g.key} className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
            <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              {single ? (
                <div>{title}</div>
              ) : (
                <Link
                  href={{ pathname: "/cliente", query: { produto: g.key } }}
                  className="group/title -m-1 flex min-w-0 items-center gap-1 rounded-lg p-1 transition-colors hover:bg-muted"
                  title={`Ver só ${g.productName}`}
                >
                  <div className="min-w-0">{title}</div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/title:translate-x-0.5" />
                </Link>
              )}
              {g.rows.length > 1 && g.worstPrice > g.bestPrice && (
                <Badge variant="secondary" className="shrink-0 rounded-full bg-brand-soft text-brand">
                  economia até {formatBRL(g.worstPrice - g.bestPrice)}
                </Badge>
              )}
            </header>
            <ol className="divide-y">
              {g.rows.map((r) => {
                const diff = percentDiff(r.price, g.bestPrice);
                const first = r.position === 1;
                return (
                  <li key={r.product_id} className={cn("flex items-center gap-3 px-5 py-3", first && "bg-brand-soft/40")}>
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                        first ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {first ? <Trophy className="size-4" /> : r.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={{ pathname: "/cliente", query: { fornecedor: r.supplier_id } }}
                        className="truncate text-sm font-medium hover:underline"
                        title={`Ver lista de ${r.supplier_name}`}
                      >
                        {r.supplier_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.supplier_city ? `${r.supplier_city} · ` : ""}
                        atualizado {formatDate(r.quote_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-semibold tabular-nums", first && "text-brand")}>{formatBRL(r.price)}</p>
                      {diff !== null && diff > 0 && (
                        <p className="text-xs text-muted-foreground tabular-nums">+{diff.toFixed(1)}%</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
