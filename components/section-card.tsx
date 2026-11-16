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
      <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div>
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      <div className={cn(!flush && "px-5 pb-5")}>{children}</div>
    </section>
  );
}
