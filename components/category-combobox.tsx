"use client";

import { Tag } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { CategoryOption } from "@/lib/queries/categories";

/**
 * Seleção de categoria com filtro por digitação. Só lista as categorias
 * definidas pelo admin — o fornecedor não cria categorias novas.
 */
export function CategoryCombobox({
  categories,
  value,
  onChange,
  placeholder = "Digite para filtrar…",
  id,
}: {
  categories: CategoryOption[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholder?: string;
  id?: string;
}) {
  const selected = categories.find((c) => c.id === value) ?? null;

  return (
    <Combobox
      items={categories}
      value={selected}
      onValueChange={(item: CategoryOption | null) => onChange(item?.id ?? null)}
      itemToStringLabel={(item: CategoryOption) => item.name}
      itemToStringValue={(item: CategoryOption) => item.id}
    >
      <ComboboxInput id={id} placeholder={placeholder} showClear={Boolean(selected)} className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>Nenhuma categoria encontrada. Peça ao administrador para criar.</ComboboxEmpty>
        <ComboboxList>
          {(item: CategoryOption) => (
            <ComboboxItem key={item.id} value={item}>
              <Tag className="size-3.5 text-muted-foreground" />
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
