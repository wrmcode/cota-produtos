"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";
import { isNavActive, type NavItem } from "./nav-pills";

/** Barra lateral fina só com ícones (como na referência). Mostra as mesmas rotas do topo. */
export function IconRail({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-24 hidden h-fit flex-col gap-1 rounded-full bg-card p-1.5 ring-1 ring-foreground/5 lg:flex">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        const active = isNavActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={cn(
              "flex size-10 items-center justify-center rounded-full transition-colors",
              active ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4.5" />
          </Link>
        );
      })}
    </aside>
  );
}
