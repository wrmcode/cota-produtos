import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { ImportWizard } from "@/components/admin/import-wizard";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { isAiImportEnabled } from "@/lib/ai-provider";
import { requireRole } from "@/lib/auth";
import { listSuppliers } from "@/lib/queries/admin";
import { listCategoryOptions } from "@/lib/queries/categories";

export const metadata: Metadata = { title: "Importar cotação" };

export default async function ImportPage() {
  const [, suppliers, categories] = await Promise.all([requireRole("admin"), listSuppliers(), listCategoryOptions()]);

  return (
    <>
      <PageHeader
        title="Importar cotação"
        description="Cole um texto ou envie fotos, PDF ou planilha de uma lista de preços. A IA interpreta os itens; você confere, ajusta e aprova antes de salvar."
      />

      {!isAiImportEnabled() ? (
        <div className="rounded-2xl bg-card ring-1 ring-foreground/5">
          <EmptyState
            icon={KeyRound}
            title="Importação assistida desativada"
            description="Defina GEMINI_API_KEY (grátis no Google AI Studio) ou ANTHROPIC_API_KEY no .env do servidor e reinicie para habilitar esta tela."
          />
        </div>
      ) : (
        <ImportWizard
          suppliers={suppliers.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name, city: s.city }))}
          categories={categories}
        />
      )}
    </>
  );
}
