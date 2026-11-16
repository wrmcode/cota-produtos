import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Package, Store, Users } from "lucide-react";
import { MissingSuppliersList } from "@/components/admin/missing-suppliers-list";
import { RecentQuotesTable } from "@/components/admin/recent-quotes-table";
import { RefreshCacheButton } from "@/components/admin/refresh-cache-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { formatDateLong } from "@/lib/format";
import { getAdminStats, getRecentQuotes, getSuppliersMissingToday } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const [user, stats, missing, recent] = await Promise.all([
    requireRole("admin"),
    getAdminStats(),
    getSuppliersMissingToday(),
    getRecentQuotes(),
  ]);
  const firstName = user.profile.full_name?.split(" ")[0] ?? "admin";

  return (
    <>
      <PageHeader title={`Bem-vindo, ${firstName}!`} description={formatDateLong()}>
        <RefreshCacheButton />
        <Button variant="outline" render={<Link href="/admin/produtos" />}>
          Unificar produtos
        </Button>
        <Button render={<Link href="/admin/fornecedores/novo" />}>
          Cadastrar fornecedor
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Fornecedores ativos" value={stats.suppliers} icon={Store} />
        <StatCard label="Clientes ativos" value={stats.customers} icon={Users} />
        <StatCard label="Produtos cadastrados" value={stats.products} icon={Package} />
        <StatCard
          label="Cotações hoje"
          value={stats.quotesToday}
          hint={`${stats.suppliersQuotedToday} de ${stats.suppliers} fornecedores enviaram`}
          icon={ClipboardList}
          tone="dark"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <SectionCard
          title="Fornecedores sem cotação hoje"
          description="Quem ainda não enviou preços"
          className="lg:col-span-2"
          flush
        >
          {missing.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Todos enviaram!" description="Nenhum fornecedor pendente hoje." />
          ) : (
            <MissingSuppliersList suppliers={missing} />
          )}
        </SectionCard>

        <SectionCard title="Últimas cotações" description="Preços enviados recentemente" className="lg:col-span-3" flush>
          {recent.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nenhuma cotação ainda" description="Assim que um fornecedor enviar preços, eles aparecem aqui." />
          ) : (
            <RecentQuotesTable quotes={recent} />
          )}
        </SectionCard>
      </div>
    </>
  );
}
