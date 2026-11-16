import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Package, Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { QuoteForm } from "@/components/supplier/quote-form";
import { Button } from "@/components/ui/button";
import { getSessionIdentity, requireRole } from "@/lib/auth";
import { formatDateLong, todayISO } from "@/lib/format";
import { getAllRankingRows } from "@/lib/queries/ranking";
import { getProductsForQuoteByProfile, getSupplierPositions } from "@/lib/queries/supplier";

export const metadata: Metadata = { title: "Cotação do dia" };

export default async function SupplierDashboard() {
  const identity = await getSessionIdentity(); // só headers, sem rede
  const [user, products] = await Promise.all([
    requireRole("supplier"),
    getProductsForQuoteByProfile(identity.id),
    getAllRankingRows(), // aquece o cache usado por getSupplierPositions
  ]);

  if (!user.supplier) {
    return (
      <EmptyState icon={Package} title="Cadastro incompleto" description="Seu usuário não está vinculado a um fornecedor. Fale com o administrador." />
    );
  }

  const positions = await getSupplierPositions(user.supplier.id); // cache quente: sem rede
  const sentToday = products.filter((p) => p.todayPrice !== null).length;
  const firstPlace = [...positions.values()].filter((p) => p.position === 1).length;

  return (
    <>
      <PageHeader title={`Olá, ${user.supplier.name}!`} description={formatDateLong()}>
        <Button variant="outline" render={<Link href="/fornecedor/produtos" />}>
          <Package />
          Gerenciar produtos
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Produtos ativos" value={products.length} icon={Package} />
        <StatCard
          label="Enviados hoje"
          value={`${sentToday}/${products.length}`}
          hint={sentToday === products.length && products.length > 0 ? "Cotação do dia completa" : `${products.length - sentToday} pendente(s)`}
          icon={CheckCircle2}
          tone={sentToday === products.length && products.length > 0 ? "brand" : "default"}
        />
        <StatCard label="Melhor preço em" value={firstPlace} hint="produtos onde você está em 1º" icon={Trophy} tone="dark" />
      </div>

      <SectionCard
        title="Preços de hoje"
        description="Informe o preço de cada produto. Campos em branco não são enviados. Você pode reenviar para corrigir."
        className="mt-4"
      >
        {products.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Você ainda não tem produtos" description="Cadastre seus produtos para começar a enviar cotações.">
            <Button render={<Link href="/fornecedor/produtos" />}>
              Cadastrar produtos
            </Button>
          </EmptyState>
        ) : (
          <QuoteForm
            quoteDate={todayISO()}
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              unit: p.unit,
              category: p.categoryName,
              todayPrice: p.todayPrice,
              lastPrice: p.lastPrice,
              lastDate: p.lastDate,
              position: positions.get(p.id) ?? null,
            }))}
          />
        )}
      </SectionCard>
    </>
  );
}
