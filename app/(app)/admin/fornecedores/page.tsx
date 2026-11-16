import type { Metadata } from "next";
import Link from "next/link";
import { Store, UserPlus } from "lucide-react";
import { SuppliersTable } from "@/components/admin/suppliers-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { listSuppliers } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function SuppliersPage() {
  const [, suppliers] = await Promise.all([requireRole("admin"), listSuppliers()]);

  return (
    <>
      <PageHeader title="Fornecedores" description={`${suppliers.length} cadastrado(s)`}>
        <Button render={<Link href="/admin/fornecedores/novo" />}>
          <UserPlus />
          Cadastrar fornecedor
        </Button>
      </PageHeader>

      <SectionCard title="Todos os fornecedores" flush>
        {suppliers.length === 0 ? (
          <EmptyState icon={Store} title="Nenhum fornecedor ainda" description="Cadastre o primeiro fornecedor captado pela equipe para começar a receber cotações.">
            <Button render={<Link href="/admin/fornecedores/novo" />}>
              Cadastrar fornecedor
            </Button>
          </EmptyState>
        ) : (
          <SuppliersTable suppliers={suppliers} />
        )}
      </SectionCard>
    </>
  );
}
