"use client";

import { AlertCircle } from "lucide-react";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatDate, todayISO } from "@/lib/format";
import type { getSuppliersMissingToday } from "@/lib/queries/admin";
import { useSearch } from "@/lib/use-search";

type Missing = Awaited<ReturnType<typeof getSuppliersMissingToday>>[number];

/** Lembrete amigável pré-preenchido no WhatsApp do vendedor. */
function reminderMessage(s: Missing): string {
  const firstName = s.seller_name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Olá, ${firstName}! Tudo bem?` : "Olá! Tudo bem?";
  return [
    `${greeting} 😊`,
    "",
    `Aqui é da equipe Cota Produtos. Ainda não recebemos suas cotações de hoje (${formatDate(todayISO())}).`,
    "",
    "Quando puder, envie os preços pelo sistema para já aparecer no ranking dos clientes hoje. Se precisar de ajuda , é só me chamar por aqui.",
    "",
    "Obrigado! 🙏",
  ].join("\n");
}

export function MissingSuppliersList({ suppliers }: { suppliers: Missing[] }) {
  const { query, setQuery, filtered } = useSearch(suppliers, (s) => [s.name, s.city, s.seller_name]);

  return (
    <>
      <div className="px-4 pb-3 sm:px-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar fornecedor…" />
      </div>
      <ul className="divide-y">
        {filtered.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum fornecedor encontrado.</li>}
        {filtered.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[s.seller_name, s.city].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <Badge variant="outline" className="hidden shrink-0 gap-1 rounded-full text-warning sm:inline-flex">
              <AlertCircle className="size-3" /> Pendente
            </Badge>
            {s.seller_whatsapp ? (
              <WhatsAppLink number={s.seller_whatsapp} iconOnly label={s.seller_name ?? s.name} message={reminderMessage(s)} />
            ) : (
              <span className="size-8 shrink-0" aria-hidden />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
