import type { Metadata } from "next";
import { ClipboardList, Package, Search, Store } from "lucide-react";
import { RankingFilters } from "@/components/customer/ranking-filters";
import { RankingList } from "@/components/customer/ranking-list";
import { SupplierPriceList } from "@/components/customer/supplier-price-list";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireRole } from "@/lib/auth";
import { formatDate, formatDateLong } from "@/lib/format";
import { getCustomerStats, getRanking, getSupplierList, listActiveSuppliers } from "@/lib/queries/customer";

export const metadata: Metadata = { title: "Ranking de preços" };

export default async function CustomerDashboard({ searchParams }: PageProps<"/cliente">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const supplierId = typeof params.fornecedor === "string" ? params.fornecedor : "";
  const productKey = typeof params.produto === "string" ? params.produto : "";

  // Consultas em paralelo com a checagem de papel (RLS já protege os dados;
  // requireRole é defesa extra e redireciona se o papel não bater).
  const [user, stats, suppliers, groups, supplierRows] = await Promise.all([
    requireRole("customer"),
    getCustomerStats(),
    listActiveSuppliers(),
    productKey ? getRanking({ groupKey: productKey }) : supplierId ? null : getRanking({ search: q }),
    !productKey && supplierId ? getSupplierList(supplierId, q) : null,
  ]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) ?? null;
  const name = user.customer?.name ?? user.profile.full_name ?? "cliente";
  const selectedProductName = productKey ? (groups?.[0]?.productName ?? "Produto") : null;

  return (
    <>
      <PageHeader title={`Bem-vindo, ${name}!`} description={formatDateLong()} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Produtos cotados" value={stats.products} icon={Package} />
        <StatCard label="Fornecedores ativos" value={stats.suppliers} icon={Store} />
        <StatCard
          label="Última atualização"
          value={stats.latestDate ? formatDate(stats.latestDate) : "—"}
          hint={`${stats.quotes} preço(s) no ranking`}
          icon={ClipboardList}
          tone="dark"
        />
      </div>

      <div className="mt-4">
        <RankingFilters
          suppliers={suppliers}
          q={q}
          supplierId={supplierId}
          selectedProduct={productKey && selectedProductName ? { key: productKey, name: selectedProductName } : null}
        />
      </div>

      <div className="mt-4">
        {stats.quotes === 0 ? (
          <div className="rounded-2xl bg-card ring-1 ring-foreground/5">
            <EmptyState icon={ClipboardList} title="Ainda não há cotações" description="Assim que os fornecedores enviarem os preços do dia, o ranking aparece aqui." />
          </div>
        ) : productKey && groups ? (
          <RankingList groups={groups} emptyIcon={Search} single />
        ) : selectedSupplier && supplierRows ? (
          <SupplierPriceList supplier={selectedSupplier} rows={supplierRows} />
        ) : (
          <RankingList groups={groups ?? []} emptyIcon={Search} />
        )}
      </div>
    </>
  );
}
