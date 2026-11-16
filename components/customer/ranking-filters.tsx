"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Package, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupplierCombobox } from "@/components/customer/supplier-combobox";

export function RankingFilters({
  suppliers,
  q,
  supplierId,
  selectedProduct,
}: {
  suppliers: { id: string; name: string; city: string | null }[];
  q: string;
  supplierId: string;
  /** Produto único escolhido ao clicar no card (param `produto`). */
  selectedProduct: { key: string; name: string } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [text, setText] = useState(q);
  const [, startTransition] = useTransition();

  const push = (next: { q?: string; fornecedor?: string; produto?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Debounce da busca. Buscar ou trocar fornecedor sai do modo "produto único".
  useEffect(() => {
    if (text === q) return;
    const t = setTimeout(() => push({ q: text, produto: "" }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const hasFilters = Boolean(q || supplierId || selectedProduct);

  return (
    <div className="space-y-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Buscar produto (ex.: frango, tomate, cerveja)…"
            className="h-10 rounded-full pl-9"
            aria-label="Buscar produto"
          />
        </div>
        <SupplierCombobox
          suppliers={suppliers}
          value={supplierId}
          onChange={(id) => push({ fornecedor: id, produto: "" })}
          className="w-full sm:w-72 [&_input]:h-10"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setText("");
              push({ q: "", fornecedor: "", produto: "" });
            }}
          >
            <X />
            Limpar
          </Button>
        )}
      </div>

      {selectedProduct && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-sm">
          <span className="text-muted-foreground">Mostrando só:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft py-1 pr-1 pl-3 font-medium text-brand">
            <Package className="size-3.5" />
            {selectedProduct.name}
            <button
              type="button"
              aria-label="Voltar para todos os produtos"
              className="flex size-5 items-center justify-center rounded-full hover:bg-brand hover:text-brand-foreground"
              onClick={() => push({ produto: "" })}
            >
              <X className="size-3" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
