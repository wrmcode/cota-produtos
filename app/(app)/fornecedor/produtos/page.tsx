import type { Metadata } from "next";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { ProductDialog } from "@/components/supplier/product-dialog";
import { ProductRowActions } from "@/components/supplier/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Produto</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(({ categoryName, ...p }) => (
                <TableRow key={p.id} className={p.is_active ? undefined : "opacity-60"}>
                  <TableCell className="pl-5 font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.unit}</TableCell>
                  <TableCell>
                    {categoryName ? (
                      <Badge variant="secondary" className="rounded-full">{categoryName}</Badge>
                    ) : (
                      <span className="text-xs text-warning">Sem categoria</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "secondary" : "outline"} className="rounded-full">
                      {p.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <ProductRowActions product={p} categories={categories} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </>
  );
}
