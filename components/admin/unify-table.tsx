"use client";

import { useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { linkCanonical } from "@/actions/admin";
import { AdminProductRowActions } from "@/components/admin/admin-product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/search-input";
import { TableNoResults } from "@/components/table-no-results";
import { TableToolbar } from "@/components/table-toolbar";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductWithSupplier } from "@/lib/queries/admin";
import type { CategoryOption } from "@/lib/queries/categories";
import { useSearch } from "@/lib/use-search";
import type { CanonicalProduct } from "@/types/database";
import { UNITS } from "@/types/schemas";

export function UnifyTable({
  products,
  canonical,
  categories,
}: {
  products: ProductWithSupplier[];
  canonical: CanonicalProduct[];
  categories: CategoryOption[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const { query, setQuery, filtered } = useSearch(products, (p) => [
    p.name,
    p.suppliers?.name,
    p.canonical_products?.name,
    p.product_categories?.name,
  ]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const firstSelected = products.find((p) => selected.has(p.id));

  return (
    <>
      <TableToolbar>
        <SearchInput
          placeholder="Buscar produto, fornecedor, categoria ou nome unificado…"
          value={query}
          onChange={setQuery}
          className="sm:max-w-sm"
        />
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-xs text-muted-foreground">
            {filtered.length} de {products.length}
          </p>
          <Button disabled={selected.size === 0} onClick={() => setOpen(true)}>
            <Link2 />
            Unificar {selected.size > 0 && `(${selected.size})`}
          </Button>
        </div>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pl-4 sm:pl-5" />
            <TableHead>Produto (como o fornecedor cadastrou)</TableHead>
            <TableHead className="hidden lg:table-cell">Unid.</TableHead>
            <TableHead className="hidden xl:table-cell">Categoria</TableHead>
            <TableHead className="hidden md:table-cell">Fornecedor</TableHead>
            <TableHead className="hidden sm:table-cell">Nome unificado</TableHead>
            <TableHead className="pr-4 text-right sm:pr-5">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && <TableNoResults colSpan={7} />}
          {filtered.map((p) => (
            <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined} className={p.is_active ? undefined : "opacity-60"}>
              <TableCell className="pl-4 sm:pl-5">
                <input
                  type="checkbox"
                  className="size-5 accent-brand sm:size-4"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  aria-label={`Selecionar ${p.name}`}
                />
              </TableCell>
              <TableCell className="whitespace-normal">
                <p className="font-medium">
                  {p.name}
                  {!p.is_active && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(inativo)</span>}
                </p>
                <p className="text-xs text-muted-foreground xl:hidden">
                  <span className="lg:hidden">{p.unit}</span>
                  {p.product_categories?.name && (
                    <>
                      <span className="lg:hidden"> · </span>
                      {p.product_categories.name}
                    </>
                  )}
                  <span className="md:hidden"> · {p.suppliers?.name}</span>
                </p>
                {p.canonical_products && (
                  <Badge variant="secondary" className="mt-1 max-w-full truncate rounded-full sm:hidden">
                    {p.canonical_products.name} / {p.canonical_products.unit}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">{p.unit}</TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">{p.product_categories?.name ?? "—"}</TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{p.suppliers?.name}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {p.canonical_products ? (
                  <Badge variant="secondary" className="rounded-full">
                    {p.canonical_products.name} / {p.canonical_products.unit}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="pr-4 text-right sm:pr-5">
                <AdminProductRowActions product={p} categories={categories} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <UnifyDialog
        open={open}
        onOpenChange={setOpen}
        canonical={canonical}
        productIds={[...selected]}
        suggestedName={firstSelected?.name ?? ""}
        suggestedUnit={firstSelected?.unit ?? "kg"}
        onDone={() => setSelected(new Set())}
      />
    </>
  );
}

function UnifyDialog({
  open,
  onOpenChange,
  canonical,
  productIds,
  suggestedName,
  suggestedUnit,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canonical: CanonicalProduct[];
  productIds: string[];
  suggestedName: string;
  suggestedUnit: string;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">(canonical.length ? "existing" : "new");
  const [existingId, setExistingId] = useState(canonical[0]?.id ?? "");
  const [name, setName] = useState(suggestedName);
  const [unit, setUnit] = useState(suggestedUnit);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const res = await linkCanonical({
        product_ids: productIds,
        canonical: mode === "existing" ? { id: existingId } : { name, unit },
      });
      if (res.ok) {
        toast.success(res.message);
        onDone();
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unificar {productIds.length} produto(s)</DialogTitle>
          <DialogDescription>
            Os produtos selecionados passam a ser comparados como um único item no ranking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === "existing" ? "default" : "outline"} size="sm" onClick={() => setMode("existing")} disabled={!canonical.length}>
              Usar existente
            </Button>
            <Button variant={mode === "new" ? "default" : "outline"} size="sm" onClick={() => setMode("new")}>
              Criar novo
            </Button>
          </div>

          {mode === "existing" ? (
            <div>
              <Label className="mb-1.5 block">Produto unificado</Label>
              <NativeSelect value={existingId} onChange={(e) => setExistingId(e.target.value)}>
                {canonical.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} / {c.unit}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <div>
                <Label className="mb-1.5 block">Nome padrão</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Peito de frango" />
              </div>
              <div>
                <Label className="mb-1.5 block">Unidade</Label>
                <NativeSelect value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending || (mode === "new" && name.trim().length < 2)}>
            {pending ? "Salvando..." : "Unificar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
