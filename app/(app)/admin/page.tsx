import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ClipboardList, Package, Store, Users } from "lucide-react";
import { RefreshCacheButton } from "@/components/admin/refresh-cache-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatBRL, formatDate, formatDateLong } from "@/lib/format";
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <ul className="divide-y">
              {missing.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    {s.city && <p className="text-xs text-muted-foreground">{s.city}</p>}
                  </div>
                  <Badge variant="outline" className="gap-1 rounded-full text-warning">
                    <AlertCircle className="size-3" /> Pendente
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Últimas cotações" description="Preços enviados recentemente" className="lg:col-span-3" flush>
          {recent.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nenhuma cotação ainda" description="Assim que um fornecedor enviar preços, eles aparecem aqui." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="pr-5 text-right">Preço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="pl-5 font-medium">
                      {q.products?.name} <span className="text-xs text-muted-foreground">/ {q.products?.unit}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{q.suppliers?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(q.quote_date)}</TableCell>
                    <TableCell className="pr-5 text-right font-medium tabular-nums">{formatBRL(q.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </div>
    </>
  );
}
