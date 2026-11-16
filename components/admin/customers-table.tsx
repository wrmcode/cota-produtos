"use client";

import { CustomerRowActions } from "@/components/admin/customer-row-actions";
import { ViewAsButton } from "@/components/admin/view-as-button";
import { SearchInput } from "@/components/search-input";
import { TableNoResults } from "@/components/table-no-results";
import { TableToolbar } from "@/components/table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { CustomerWithProfile } from "@/lib/queries/admin";
import { useSearch } from "@/lib/use-search";

export function CustomersTable({ customers }: { customers: CustomerWithProfile[] }) {
  const { query, setQuery, filtered } = useSearch(customers, (c) => [c.name, c.business_type, c.city, c.profiles?.full_name, c.profiles?.email]);

  return (
    <>
      <TableToolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar estabelecimento, responsável ou cidade…" className="sm:max-w-sm" />
        <p className="text-xs text-muted-foreground">
          {filtered.length} de {customers.length}
        </p>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 sm:pl-5">Estabelecimento</TableHead>
            <TableHead className="hidden lg:table-cell">Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Responsável</TableHead>
            <TableHead className="hidden lg:table-cell">Cidade</TableHead>
            <TableHead className="hidden xl:table-cell">Desde</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="pr-4 text-right sm:pr-5">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && <TableNoResults colSpan={7} />}
          {filtered.map((c) => {
            const { profiles, ...customer } = c;
            return (
              <TableRow key={c.id} className={c.is_active ? undefined : "opacity-60"}>
                <TableCell className="max-w-56 pl-4 whitespace-normal sm:max-w-none sm:pl-5">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground lg:hidden">
                    {c.business_type ?? "—"}
                    {c.city && ` · ${c.city}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground md:hidden">{profiles?.full_name ?? profiles?.email ?? "—"}</p>
                  {!c.is_active && (
                    <Badge variant="outline" className="mt-1 rounded-full sm:hidden">
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">{c.business_type ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <p>{profiles?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{profiles?.email}</p>
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">{c.city ?? "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">{formatDate(c.created_at)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={c.is_active ? "secondary" : "outline"} className="rounded-full">
                    {c.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-4 text-right sm:pr-5">
                  <div className="inline-flex items-center gap-1">
                    <ViewAsButton kind="customer" id={c.id} />
                    <CustomerRowActions customer={customer} email={profiles?.email} />
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
