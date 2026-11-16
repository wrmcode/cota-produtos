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

export function NavPills({
  items,
  className,
  labels = "sm",
}: {
  items: NavItem[];
  className?: string;
  /** `always`: rótulo sempre visível (barra mobile). `sm`: só a partir de `sm`. */
  labels?: "always" | "sm";
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex items-center gap-1 rounded-full bg-card p-1 ring-1 ring-foreground/5",
        labels === "always" && "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        const active = isNavActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-3.5",
              labels === "always" && "min-w-fit flex-1 shrink-0 text-xs sm:flex-none sm:text-sm",
              active ? "bg-brand-dark text-brand-dark-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className={cn("whitespace-nowrap", labels === "sm" && "hidden sm:inline")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
