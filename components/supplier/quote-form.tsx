"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveQuotes } from "@/actions/supplier";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface QuoteFormProduct {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  todayPrice: number | null;
  lastPrice: number | null;
  lastDate: string | null;
  position: { position: number; total: number } | null;
}

function toInput(v: number | null): string {
  return v === null ? "" : v.toFixed(2).replace(".", ",");
}

function parsePrice(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

export function QuoteForm({ products, quoteDate }: { products: QuoteFormProduct[]; quoteDate: string }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((p) => [p.id, toInput(p.todayPrice)])),
  );
  const [pending, startTransition] = useTransition();

  const filled = products.filter((p) => parsePrice(values[p.id] ?? "") !== null).length;

  const copyLast = () =>
    setValues((prev) => {
      const next = { ...prev };
      for (const p of products) if (!next[p.id] && p.lastPrice !== null) next[p.id] = toInput(p.lastPrice);
      return next;
    });

  const submit = () =>
    startTransition(async () => {
      const lines = products
        .map((p) => ({ product_id: p.id, price: parsePrice(values[p.id] ?? "") }))
        .filter((l): l is { product_id: string; price: number } => l.price !== null);
      if (lines.length === 0) {
        toast.error("Informe ao menos um preço");
        return;
      }
      const res = await saveQuotes({ quote_date: quoteDate, lines });
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
    });

  return (
    <div className="space-y-4">
      <div className="-mx-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Produto</TableHead>
              <TableHead>Último preço</TableHead>
              <TableHead>Posição</TableHead>
              <TableHead className="pr-5 text-right">Preço de hoje (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const current = parsePrice(values[p.id] ?? "");
              const diff = current !== null && p.lastPrice ? ((current - p.lastPrice) / p.lastPrice) * 100 : null;
              return (
                <TableRow key={p.id}>
                  <TableCell className="pl-5">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      por {p.unit}
                      {p.category && ` · ${p.category}`}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {p.lastPrice !== null ? (
                      <>
                        {formatBRL(p.lastPrice)} <span className="text-xs">({formatDate(p.lastDate)})</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {p.position ? (
                      <Badge
                        variant="secondary"
                        className={cn("rounded-full", p.position.position === 1 && "bg-brand-soft text-brand")}
                      >
                        {p.position.position}º de {p.position.total}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="ml-auto flex max-w-44 flex-col items-end gap-1">
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        className="text-right tabular-nums"
                        value={values[p.id] ?? ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        aria-label={`Preço de ${p.name}`}
                      />
                      {diff !== null && Math.abs(diff) >= 0.5 && (
                        <span className={cn("text-xs tabular-nums", diff > 0 ? "text-destructive" : "text-success")}>
                          {diff > 0 ? "+" : ""}
                          {diff.toFixed(1)}% vs último
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filled} de {products.length} preço(s) preenchido(s)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyLast} disabled={pending}>
            Repetir últimos preços
          </Button>
          <Button onClick={submit} disabled={pending || filled === 0}>
            {pending ? "Enviando..." : "Enviar cotação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
