"use client";

import { SearchInput } from "@/components/search-input";
import { TableNoResults } from "@/components/table-no-results";
import { TableToolbar } from "@/components/table-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatDate } from "@/lib/format";
import type { getRecentQuotes } from "@/lib/queries/admin";
import { useSearch } from "@/lib/use-search";

type Quote = Awaited<ReturnType<typeof getRecentQuotes>>[number];

export function RecentQuotesTable({ quotes }: { quotes: Quote[] }) {
  const { query, setQuery, filtered } = useSearch(quotes, (q) => [q.products?.name, q.suppliers?.name]);

  return (
    <>
      <TableToolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar produto ou fornecedor…" className="sm:max-w-xs" />
      </TableToolbar>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 sm:pl-5">Produto</TableHead>
            <TableHead className="hidden md:table-cell">Fornecedor</TableHead>
            <TableHead className="hidden sm:table-cell">Data</TableHead>
            <TableHead className="pr-4 text-right sm:pr-5">Preço</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && <TableNoResults colSpan={4} />}
          {filtered.map((q) => (
            <TableRow key={q.id}>
              <TableCell className="pl-4 whitespace-normal sm:pl-5">
                <p className="font-medium">
                  {q.products?.name} <span className="text-xs font-normal text-muted-foreground">/ {q.products?.unit}</span>
                </p>
                <p className="text-xs text-muted-foreground md:hidden">
                  {q.suppliers?.name}
                  <span className="sm:hidden"> · {formatDate(q.quote_date)}</span>
                </p>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{q.suppliers?.name}</TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(q.quote_date)}</TableCell>
              <TableCell className="pr-4 text-right font-medium tabular-nums sm:pr-5">{formatBRL(q.price)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
