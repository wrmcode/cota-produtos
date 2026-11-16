import type { Metadata } from "next";
import { Store } from "lucide-react";
import { SupplierCards, type SupplierCardStats } from "@/components/customer/supplier-cards";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { getSupplierSummaries, listActiveSuppliers } from "@/lib/queries/customer";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function CustomerSuppliersPage() {
  const [, suppliers, summaries] = await Promise.all([requireRole("customer"), listActiveSuppliers(), getSupplierSummaries()]);

  // Map não é serializável para Client Components: converte para objeto simples.
  const stats: Record<string, SupplierCardStats> = {};
  for (const [id, s] of summaries) stats[id] = { products: s.products, firsts: s.firsts };

  return (
    <>
      <PageHeader title="Fornecedores" description="Condições comerciais e lista de preços de cada fornecedor." />

      {suppliers.length === 0 ? (
        <div className="rounded-2xl bg-card ring-1 ring-foreground/5">
          <EmptyState icon={Store} title="Nenhum fornecedor ativo" />
        </div>
      ) : (
        <SupplierCards suppliers={suppliers} stats={stats} />
      )}
    </>
  );
}
