"use client";

import { useMemo, useState, useTransition } from "react";
import { Link2, Link2Off } from "lucide-react";
import { toast } from "sonner";
import { linkCanonical, unlinkCanonical } from "@/actions/admin";
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
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductWithSupplier } from "@/lib/queries/admin";
import type { CanonicalProduct } from "@/types/database";
import { UNITS } from "@/types/schemas";

export function UnifyTable({ products, canonical }: { products: ProductWithSupplier[]; canonical: CanonicalProduct[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.suppliers?.name.toLowerCase().includes(q) || p.canonical_products?.name.toLowerCase().includes(q),
    );
  }, [products, search]);

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
      <div className="flex flex-col gap-3 px-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Buscar produto, fornecedor ou nome unificado…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Button disabled={selected.size === 0} onClick={() => setOpen(true)}>
          <Link2 />
          Unificar {selected.size > 0 && `(${selected.size})`}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pl-5" />
            <TableHead>Produto (como o fornecedor cadastrou)</TableHead>
            <TableHead>Unid.</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Nome unificado</TableHead>
            <TableHead className="pr-5 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((p) => (
            <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
              <TableCell className="pl-5">
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  aria-label={`Selecionar ${p.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-muted-foreground">{p.unit}</TableCell>
              <TableCell className="text-muted-foreground">{p.product_categories?.name ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{p.suppliers?.name}</TableCell>
              <TableCell>
                {p.canonical_products ? (
                  <Badge variant="secondary" className="rounded-full">
                    {p.canonical_products.name} / {p.canonical_products.unit}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="pr-5 text-right">
                {p.canonical_products && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover unificação"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await unlinkCanonical(p.id);
                        if (res.ok) toast.success("Unificação removida");
                        else toast.error(res.error);
                      })
                    }
                  >
                    <Link2Off />
                  </Button>
                )}
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
