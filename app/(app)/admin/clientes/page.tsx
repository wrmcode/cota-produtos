import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { CustomerRowActions } from "@/components/admin/customer-row-actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Estabelecimento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const { profiles, ...customer } = c;
                return (
                  <TableRow key={c.id} className={c.is_active ? undefined : "opacity-60"}>
                    <TableCell className="pl-5 font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.business_type ?? "—"}</TableCell>
                    <TableCell>
                      <p>{profiles?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{profiles?.email}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.city ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "secondary" : "outline"} className="rounded-full">
                        {c.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <CustomerRowActions customer={customer} email={profiles?.email} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </>
  );
}
