import { cn } from "@/lib/utils";

/** Faixa acima de uma tabela em SectionCard `flush`: busca à esquerda, ações à direita. */
export function TableToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-5", className)}>
      {children}
    </div>
  );
}
