import type { Metadata } from "next";
import { Package } from "lucide-react";
import { UnifyTable } from "@/components/admin/unify-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { listAllProducts, listCanonicalProducts } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Produtos" };

export default async function AdminProductsPage() {
  const [, products, canonical] = await Promise.all([requireRole("admin"), listAllProducts(), listCanonicalProducts()]);
  const unlinked = products.filter((p) => !p.canonical_id).length;

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Fornecedores cadastram produtos livremente. Unifique nomes diferentes do mesmo item para o ranking comparar corretamente."
      />

      <SectionCard
        title="Catálogo dos fornecedores"
        description={`${products.length} produto(s) · ${unlinked} sem unificação`}
        flush
      >
        {products.length === 0 ? (
          <EmptyState icon={Package} title="Nenhum produto cadastrado" description="Os produtos aparecem aqui quando os fornecedores cadastrarem." />
        ) : (
          <UnifyTable products={products} canonical={canonical} />
        )}
      </SectionCard>
    </>
  );
}
