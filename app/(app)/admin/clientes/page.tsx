import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { CustomersTable } from "@/components/admin/customers-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { listCustomers } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage() {
  const [, customers] = await Promise.all([requireRole("admin"), listCustomers()]);

  return (
    <>
      <PageHeader title="Clientes" description={`${customers.length} cadastrado(s)`}>
        <Button render={<Link href="/admin/clientes/novo" />}>
          <UserPlus />
          Cadastrar cliente
        </Button>
      </PageHeader>

      <SectionCard title="Todos os clientes" flush>
        {customers.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum cliente ainda" description="Cadastre restaurantes, bares e outros estabelecimentos captados pela equipe.">
            <Button render={<Link href="/admin/clientes/novo" />}>
              Cadastrar cliente
            </Button>
          </EmptyState>
        ) : (
          <CustomersTable customers={customers} />
        )}
      </SectionCard>
    </>
  );
}
