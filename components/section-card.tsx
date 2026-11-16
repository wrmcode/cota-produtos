import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  flush = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Sem padding interno (para tabelas). */
  flush?: boolean;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5", className)}>
      <header className={cn("flex flex-col gap-3 px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4", action && "sm:flex-row sm:items-start sm:justify-between")}>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </header>
      <div className={cn(!flush && "px-4 pb-4 sm:px-5 sm:pb-5")}>{children}</div>
    </section>
  );
}
