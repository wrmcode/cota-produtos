import { Search, Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatDate, percentDiff } from "@/lib/format";
import type { getSupplierList, SupplierPublic } from "@/lib/queries/customer";
import { cn } from "@/lib/utils";
import { SupplierInfo, SupplierTypeBadge } from "./supplier-info";

type Row = Awaited<ReturnType<typeof getSupplierList>>[number];

export function SupplierPriceList({ supplier, rows }: { supplier: SupplierPublic; rows: Row[] }) {
  const firsts = rows.filter((r) => r.position === 1).length;

  return (
    <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
      <header className="space-y-4 px-5 pt-5 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold">{supplier.name}</h2>
            <SupplierTypeBadge type={supplier.supplier_type} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {supplier.city ? `${supplier.city} · ` : ""}
            {rows.length} produto(s) · melhor preço em {firsts}
          </p>
        </div>
        <SupplierInfo supplier={supplier} />
      </header>

      {rows.length === 0 ? (
        <EmptyState icon={Search} title="Nenhum produto encontrado" description="Esse fornecedor não tem produtos cotados com esse filtro." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Produto</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead>Posição</TableHead>
              <TableHead className="text-right">Melhor do mercado</TableHead>
              <TableHead className="pr-5 text-right">Preço</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const first = r.position === 1;
              const diff = r.best ? percentDiff(r.price, r.best.price) : null;
              return (
                <TableRow key={r.product_id}>
                  <TableCell className="pl-5">
                    <p className="font-medium">{r.product_name}</p>
                    <p className="text-xs text-muted-foreground">por {r.unit}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.quote_date)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("gap-1 rounded-full", first && "bg-brand-soft text-brand")}>
                      {first && <Trophy className="size-3" />}
                      {r.position}º de {r.competitors}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {first || !r.best ? (
                      "—"
                    ) : (
                      <>
                        {formatBRL(r.best.price)}
                        <span className="block text-xs">{r.best.supplier}</span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <p className={cn("font-semibold tabular-nums", first && "text-brand")}>{formatBRL(r.price)}</p>
                    {diff !== null && diff > 0 && <p className="text-xs text-muted-foreground tabular-nums">+{diff.toFixed(1)}%</p>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
