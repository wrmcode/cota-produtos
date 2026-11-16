import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { listCategoriesWithCounts } from "@/lib/queries/categories";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const [, categories] = await Promise.all([requireRole("admin"), listCategoriesWithCounts()]);

  return (
    <>
      <PageHeader
        title="Categorias de produto"
        description="Só o administrador cria e edita categorias. Os fornecedores escolhem entre estas ao cadastrar produtos, evitando duplicidades como “carne” e “carnes”."
      />
      <CategoryManager categories={categories} />
    </>
  );
}
