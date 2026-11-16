import type { Metadata } from "next";
import { Package } from "lucide-react";
import { UnifyTable } from "@/components/admin/unify-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { listAllProducts, listCanonicalProducts } from "@/lib/queries/admin";
import { listCategoryOptions } from "@/lib/queries/categories";

export const metadata: Metadata = { title: "Produtos" };

export default async function AdminProductsPage() {
  const [, products, canonical, categories] = await Promise.all([
    requireRole("admin"),
    listAllProducts(),
    listCanonicalProducts(),
    listCategoryOptions(),
  ]);
  const unlinked = products.filter((p) => !p.canonical_id).length;

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Fornecedores cadastram produtos livremente. Edite nome, unidade e categoria quando precisar e unifique nomes diferentes do mesmo item para o ranking comparar corretamente."
      />

      <SectionCard
        title="Catálogo dos fornecedores"
        description={`${products.length} produto(s) · ${unlinked} sem unificação`}
        flush
      >
        {products.length === 0 ? (
          <EmptyState icon={Package} title="Nenhum produto cadastrado" description="Os produtos aparecem aqui quando os fornecedores cadastrarem." />
        ) : (
          <UnifyTable products={products} canonical={canonical} categories={categories} />
        )}
      </SectionCard>
    </>
  );
}
