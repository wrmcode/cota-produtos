import { Eye } from "lucide-react";
import { startViewAs } from "@/actions/view-as";
import { Button } from "@/components/ui/button";
import type { ViewAsKind } from "@/lib/view-as";

/** Botão "Acessar" na listagem: entra nas telas do fornecedor/cliente como admin. */
export function ViewAsButton({ kind, id }: { kind: ViewAsKind; id: string }) {
  const label = kind === "supplier" ? "Acessar como fornecedor" : "Acessar como cliente";
  return (
    <form action={startViewAs.bind(null, kind, id)}>
      <Button type="submit" variant="outline" size="sm" title={label} aria-label={label}>
        <Eye />
        Acessar
      </Button>
    </form>
  );
}
