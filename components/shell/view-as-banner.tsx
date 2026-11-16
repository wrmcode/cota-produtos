import Link from "next/link";
import { ArrowLeftRight, Eye, ShieldCheck } from "lucide-react";
import { stopViewAs } from "@/actions/view-as";
import { Button } from "@/components/ui/button";
import type { Actor } from "@/lib/auth";
import type { UserRole } from "@/types/database";

const LABEL: Record<Exclude<UserRole, "admin">, { role: string; list: string }> = {
  supplier: { role: "fornecedor", list: "/admin/fornecedores" },
  customer: { role: "cliente", list: "/admin/clientes" },
};

/** Faixa fixa quando um admin está navegando como fornecedor/cliente. */
export function ViewAsBanner({ actor, role, name }: { actor: Actor; role: UserRole; name: string }) {
  if (role === "admin") return null;
  const l = LABEL[role];

  return (
    <div className="bg-brand-dark text-brand-dark-foreground">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <p className="flex items-center gap-2">
          <Eye className="size-4 text-brand" />
          <span>
            Você está vendo como <strong>{name || actor.viewingName}</strong> ({l.role}). Tudo que fizer aqui vale como se fosse este{" "}
            {l.role}.
          </span>
        </p>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="text-brand-dark-foreground hover:bg-white/10 hover:text-brand-dark-foreground" render={<Link href={l.list} />}>
            <ArrowLeftRight />
            Trocar {l.role}
          </Button>
          <form action={stopViewAs.bind(null, "/admin")}>
            <Button type="submit" size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
              <ShieldCheck />
              Voltar ao admin
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
