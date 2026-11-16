"use client";

import { Store } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { normalizeText } from "@/lib/search";

export interface SupplierOption {
  id: string;
  name: string;
  city: string | null;
}

/** Seleção de fornecedor com filtro por nome/cidade (substitui o <select> longo do ranking). */
export function SupplierCombobox({
  suppliers,
  value,
  onChange,
  className,
}: {
  suppliers: SupplierOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const selected = suppliers.find((s) => s.id === value) ?? null;

  return (
    <Combobox
      items={suppliers}
      autoHighlight
      value={selected}
      onValueChange={(item: SupplierOption | null) => onChange(item?.id ?? "")}
      itemToStringLabel={(item: SupplierOption) => item.name}
      itemToStringValue={(item: SupplierOption) => item.id}
      filter={(item: SupplierOption, query: string) => {
        const q = normalizeText(query);
        return !q || q.split(" ").every((w) => normalizeText(`${item.name} ${item.city ?? ""}`).includes(w));
      }}
    >
      <ComboboxInput
        placeholder="Todos os fornecedores (ranking)"
        aria-label="Filtrar por fornecedor"
        showClear={Boolean(selected)}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum fornecedor encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(item: SupplierOption) => (
            <ComboboxItem key={item.id} value={item}>
              <Store className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{item.name}</span>
              {item.city && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{item.city}</span>}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
