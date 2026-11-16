import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-dark">
        <span className="grid grid-cols-2 gap-0.5">
          <span className="size-1.5 rounded-sm bg-brand" />
          <span className="size-1.5 rounded-sm bg-brand-dark-foreground/70" />
          <span className="size-1.5 rounded-sm bg-brand-dark-foreground/70" />
          <span className="size-1.5 rounded-sm bg-brand" />
        </span>
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight">
        Cota<span className="text-brand">Produtos</span>
      </span>
    </Link>
  );
}
