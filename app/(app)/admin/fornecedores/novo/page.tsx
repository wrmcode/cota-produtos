import type { Metadata } from "next";
import { SupplierForm } from "@/components/admin/supplier-form";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Novo fornecedor" };

export default async function NewSupplierPage() {
  await requireRole("admin");
  return (
    <>
      <PageHeader title="Cadastrar fornecedor" description="Preencha os dados captados pela equipe e defina o acesso do vendedor." />
      <SupplierForm />
    </>
  );
}
