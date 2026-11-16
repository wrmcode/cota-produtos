"use client";

import { SearchInput } from "@/components/search-input";
import { ProductRowActions } from "@/components/supplier/product-row-actions";
import { TableNoResults } from "@/components/table-no-results";
import { TableToolbar } from "@/components/table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CategoryOption } from "@/lib/queries/categories";
import type { ProductWithCategory } from "@/lib/queries/supplier";
import { useSearch } from "@/lib/use-search";

export function SupplierProductsTable({ products, categories }: { products: ProductWithCategory[]; categories: CategoryOption[] }) {
  const { query, setQuery, filtered } = useSearch(products, (p) => [p.name, p.unit, p.categoryName]);

  return (
    <>
      <TableToolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar produto ou categoria…" className="sm:max-w-sm" />
        <p className="text-xs text-muted-foreground">
          {filtered.length} de {products.length}
        </p>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 sm:pl-5">Produto</TableHead>
            <TableHead className="hidden sm:table-cell">Unidade</TableHead>
            <TableHead className="hidden md:table-cell">Categoria</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="pr-4 text-right sm:pr-5">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && <TableNoResults colSpan={5} />}
          {filtered.map(({ categoryName, ...p }) => (
            <TableRow key={p.id} className={p.is_active ? undefined : "opacity-60"}>
              <TableCell className="pl-4 whitespace-normal sm:pl-5">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground md:hidden">
                  <span className="sm:hidden">por {p.unit}</span>
                  {categoryName ? (
                    <>
                      <span className="sm:hidden"> · </span>
                      {categoryName}
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden"> · </span>
                      <span className="text-warning">Sem categoria</span>
                    </>
                  )}
                  {!p.is_active && <span className="sm:hidden"> · Inativo</span>}
                </p>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">{p.unit}</TableCell>
              <TableCell className="hidden md:table-cell">
                {categoryName ? (
                  <Badge variant="secondary" className="rounded-full">{categoryName}</Badge>
                ) : (
                  <span className="text-xs text-warning">Sem categoria</span>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant={p.is_active ? "secondary" : "outline"} className="rounded-full">
                  {p.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="pr-4 text-right sm:pr-5">
                <ProductRowActions product={p} categories={categories} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
