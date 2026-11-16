import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "dark" | "brand";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-6 rounded-2xl p-5 ring-1 ring-foreground/5",
        tone === "default" && "bg-card",
        tone === "dark" && "bg-brand-dark text-brand-dark-foreground",
        tone === "brand" && "bg-brand text-brand-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full",
              tone === "default" ? "bg-brand-soft text-brand" : "bg-white/15",
            )}
          >
            <Icon className="size-3.5" />
          </span>
        )}
        <span className={cn("text-sm", tone === "default" ? "text-muted-foreground" : "opacity-80")}>{label}</span>
      </div>
      <div>
        <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
        {hint && <p className={cn("mt-1 text-xs", tone === "default" ? "text-muted-foreground" : "opacity-70")}>{hint}</p>}
      </div>
    </div>
  );
}
