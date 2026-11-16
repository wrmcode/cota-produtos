import type { Metadata } from "next";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { ProductDialog } from "@/components/supplier/product-dialog";
import { SupplierProductsTable } from "@/components/supplier/products-table";
import { getSessionIdentity, requireRole } from "@/lib/auth";
import { listCategoryOptions } from "@/lib/queries/categories";
import { listSupplierProductsByProfile } from "@/lib/queries/supplier";

export const metadata: Metadata = { title: "Meus produtos" };

export default async function SupplierProductsPage() {
  const identity = await getSessionIdentity();
  const [, products, categories] = await Promise.all([
    requireRole("supplier"),
    listSupplierProductsByProfile(identity.id),
    listCategoryOptions(),
  ]);
  const uncategorized = products.filter((p) => p.is_active && !p.category_id).length;

  return (
    <>
      <PageHeader title="Meus produtos" description="Os itens que você cota diariamente.">
        <ProductDialog categories={categories} />
      </PageHeader>

      <SectionCard
        title="Catálogo"
        description={`${products.length} produto(s)${uncategorized ? ` · ${uncategorized} sem categoria` : ""}`}
        flush
      >
        {products.length === 0 ? (
          <EmptyState icon={Package} title="Nenhum produto" description="Cadastre os produtos que você fornece para começar a enviar preços.">
            <ProductDialog categories={categories} />
          </EmptyState>
        ) : (
          <SupplierProductsTable products={products} categories={categories} />
        )}
      </SectionCard>
    </>
  );
}
