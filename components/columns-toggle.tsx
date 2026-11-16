"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Columns } from "@/lib/use-columns";
import { cn } from "@/lib/utils";

/** Botões "uma coluna / duas colunas" para listas de cards. Oculto no celular (sempre 1 coluna). */
export function ColumnsToggle({
  value,
  onChange,
  className,
}: {
  value: Columns;
  onChange: (c: Columns) => void;
  className?: string;
}) {
  const options: { value: Columns; label: string; icon: typeof Rows3 }[] = [
    { value: 1, label: "Uma coluna", icon: Rows3 },
    { value: 2, label: "Duas colunas", icon: LayoutGrid },
  ];
  return (
    <div
      className={cn(
        "hidden items-center gap-0.5 rounded-full bg-card p-0.5 ring-1 ring-foreground/5 md:flex",
        className,
      )}
      role="group"
      aria-label="Layout da lista"
    >
      {options.map((o) => (
        <Button
          key={o.value}
          variant="ghost"
          size="icon-sm"
          aria-label={o.label}
          aria-pressed={value === o.value}
          title={o.label}
          className={cn(
            "rounded-full",
            value === o.value &&
              "bg-brand-dark text-brand-dark-foreground hover:bg-brand-dark hover:text-brand-dark-foreground",
          )}
          onClick={() => onChange(o.value)}
        >
          <o.icon />
        </Button>
      ))}
    </div>
  );
}
