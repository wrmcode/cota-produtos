"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ICONS, type NavIconName } from "./nav-icons";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
}

export function isNavActive(pathname: string, { href, exact }: Pick<NavItem, "href" | "exact">) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function NavPills({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center gap-1 rounded-full bg-card p-1 ring-1 ring-foreground/5", className)}>
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        const active = isNavActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-brand-dark text-brand-dark-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
