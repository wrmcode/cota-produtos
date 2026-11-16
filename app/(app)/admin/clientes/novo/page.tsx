import type { Metadata } from "next";
import { CustomerForm } from "@/components/admin/customer-form";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NewCustomerPage() {
  await requireRole("admin");
  return (
    <>
      <PageHeader title="Cadastrar cliente" description="Preencha os dados do estabelecimento e defina o acesso do responsável." />
      <CustomerForm />
    </>
  );
}
