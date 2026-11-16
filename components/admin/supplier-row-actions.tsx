"use client";

import { useState, useTransition } from "react";
import { Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { toggleActive } from "@/actions/admin";
import { startViewAs } from "@/actions/view-as";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Supplier } from "@/types/database";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { SupplierDialog } from "./supplier-dialog";

export function SupplierRowActions({ supplier, email }: { supplier: Supplier; email?: string | null }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações" disabled={pending} />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => startTransition(() => startViewAs("supplier", supplier.id))}>
            <Eye className="size-4" />
            Acessar como fornecedor
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPwdOpen(true)}>Redefinir senha</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                const res = await toggleActive({ table: "suppliers", id: supplier.id, is_active: !supplier.is_active });
                if (res.ok) toast.success(supplier.is_active ? "Fornecedor desativado" : "Fornecedor ativado");
                else toast.error(res.error);
              })
            }
          >
            {supplier.is_active ? "Desativar" : "Ativar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SupplierDialog supplier={supplier} open={editOpen} onOpenChange={setEditOpen} />
      <ResetPasswordDialog profileId={supplier.profile_id} email={email} open={pwdOpen} onOpenChange={setPwdOpen} />
    </>
  );
}
