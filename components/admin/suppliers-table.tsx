"use client";

import { useMemo, useState } from "react";
import { SupplierRowActions } from "@/components/admin/supplier-row-actions";
import { ViewAsButton } from "@/components/admin/view-as-button";
import { SearchInput } from "@/components/search-input";
import { TableNoResults } from "@/components/table-no-results";
import { TableToolbar } from "@/components/table-toolbar";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatMinOrder } from "@/lib/format";
import type { SupplierWithProfile } from "@/lib/queries/admin";
import { useSearch } from "@/lib/use-search";

type SortKey =
  "name-asc" | "name-desc" | "products-desc" | "active-first" | "newest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Nome (A–Z)" },
  { value: "name-desc", label: "Nome (Z–A)" },
  { value: "products-desc", label: "Mais produtos" },
  { value: "active-first", label: "Ativos primeiro" },
  { value: "newest", label: "Mais recentes" },
];

const collator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});
const productCount = (s: SupplierWithProfile) => s.products?.[0]?.count ?? 0;

export function SuppliersTable({
  suppliers,
}: {
  suppliers: SupplierWithProfile[];
}) {
  const { query, setQuery, filtered } = useSearch(suppliers, (s) => [
    s.name,
    s.seller_name,
    s.city,
    s.supplier_type,
    s.profiles?.email,
  ]);
  const [sort, setSort] = useState<SortKey>("name-asc");

  const sorted = useMemo(() => {
    const byName = (a: SupplierWithProfile, b: SupplierWithProfile) =>
      collator.compare(a.name, b.name);
    const list = [...filtered];
    switch (sort) {
      case "name-desc":
        return list.sort((a, b) => byName(b, a));
      case "products-desc":
        return list.sort(
          (a, b) => productCount(b) - productCount(a) || byName(a, b),
        );
      case "active-first":
        return list.sort(
          (a, b) => Number(b.is_active) - Number(a.is_active) || byName(a, b),
        );
      case "newest":
        return list.sort(
          (a, b) => b.created_at.localeCompare(a.created_at) || byName(a, b),
        );
      default:
        return list.sort(byName);
    }
  }, [filtered, sort]);

  return (
    <>
      <TableToolbar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar fornecedor, vendedor ou cidade…"
          className="sm:max-w-sm"
        />
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="shrink-0 text-xs text-muted-foreground">
            {filtered.length} de {suppliers.length}
          </p>
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
        </div>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 sm:pl-5">Fornecedor</TableHead>
            <TableHead className="hidden md:table-cell">Vendedor</TableHead>
            <TableHead className="hidden lg:table-cell">
              Pedido mínimo
            </TableHead>
            <TableHead className="hidden xl:table-cell">
              Pagamento / Entrega
            </TableHead>
            <TableHead className="hidden text-right md:table-cell">
              Produtos
            </TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="pr-4 text-right sm:pr-5">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && <TableNoResults colSpan={7} />}
          {sorted.map((s) => {
            const { profiles, products, ...supplier } = s;
            const seller = s.seller_name ?? profiles?.full_name ?? "—";
            return (
              <TableRow
                key={s.id}
                className={s.is_active ? undefined : "opacity-60"}
              >
                <TableCell className="max-w-56 pl-4 whitespace-normal sm:max-w-none sm:pl-5">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.supplier_type ?? "—"}
                    {s.city && ` · ${s.city}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground md:hidden">
                    {seller}
                    {s.seller_whatsapp && (
                      <>
                        {" · "}
                        <WhatsAppLink number={s.seller_whatsapp} />
                      </>
                    )}
                  </p>
                  {!s.is_active && (
                    <Badge
                      variant="outline"
                      className="mt-1 rounded-full sm:hidden"
                    >
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p>{seller}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.seller_whatsapp ? (
                      <WhatsAppLink number={s.seller_whatsapp} />
                    ) : (
                      profiles?.email
                    )}
                  </p>
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {formatMinOrder(s.min_order_kg, s.min_order_brl)}
                </TableCell>
                <TableCell className="hidden max-w-56 xl:table-cell">
                  <p className="truncate text-sm">{s.payment_terms ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.delivery_info ?? ""}
                  </p>
                </TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">
                  {products?.[0]?.count ?? 0}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    variant={s.is_active ? "secondary" : "outline"}
                    className="rounded-full"
                  >
                    {s.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-4 text-right sm:pr-5">
                  <div className="inline-flex items-center gap-1">
                    <ViewAsButton kind="supplier" id={s.id} />
                    <SupplierRowActions
                      supplier={supplier}
                      email={profiles?.email}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
