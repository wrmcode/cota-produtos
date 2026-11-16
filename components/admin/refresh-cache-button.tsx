"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshAllCaches } from "@/actions/cache";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Botão do admin: limpa o cache de dados e recarrega a página com dados frescos do Supabase. */
export function RefreshCacheButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className={className}
      disabled={pending}
      title="Os dados ficam em cache para carregar rápido. Clique para buscar tudo de novo no Supabase."
      onClick={() =>
        startTransition(async () => {
          const res = await refreshAllCaches();
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      <RefreshCw className={cn(pending && "animate-spin")} />
      {pending ? "Atualizando..." : "Atualizar dados"}
    </Button>
  );
}
