"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { toggleActive } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Customer } from "@/types/database";
import { ResetPasswordDialog } from "./reset-password-dialog";

export function CustomerRowActions({ customer, email }: { customer: Customer; email?: string | null }) {
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações" disabled={pending} />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPwdOpen(true)}>Redefinir senha</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                const res = await toggleActive({ table: "customers", id: customer.id, is_active: !customer.is_active });
                if (res.ok) toast.success(customer.is_active ? "Cliente desativado" : "Cliente ativado");
                else toast.error(res.error);
              })
            }
          >
            {customer.is_active ? "Desativar" : "Ativar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ResetPasswordDialog profileId={customer.profile_id} email={email} open={pwdOpen} onOpenChange={setPwdOpen} />
    </>
  );
}
