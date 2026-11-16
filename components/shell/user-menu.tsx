"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";

export function UserMenu({ name, email, roleLabel }: { name: string; email: string; roleLabel: string }) {
  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Menu do usuário"
            />
          }
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-brand-soft text-sm font-semibold text-brand">{initials(name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {/* GroupLabel do Base UI precisa estar dentro de um Group */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <p className="truncate font-medium">{name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
              <p className="mt-1 text-xs font-normal text-brand">{roleLabel}</p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {/* Formulário + Server Action: funciona mesmo sem JS e não depende do onClick do menu */}
          <form action={signOut} className="p-1">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>

      <form action={signOut} className="hidden sm:block">
        <Button type="submit" variant="ghost" size="icon-lg" aria-label="Sair" title="Sair">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
