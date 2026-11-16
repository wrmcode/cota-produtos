import type { Metadata } from "next";
import Link from "next/link";
import { Store, UserPlus } from "lucide-react";
import { SupplierRowActions } from "@/components/admin/supplier-row-actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatMinOrder } from "@/lib/format";
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Fornecedor</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Pedido mínimo</TableHead>
                <TableHead>Pagamento / Entrega</TableHead>
                <TableHead className="text-right">Produtos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => {
                const { profiles, products, ...supplier } = s;
                return (
                  <TableRow key={s.id} className={s.is_active ? undefined : "opacity-60"}>
                    <TableCell className="pl-5">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.supplier_type ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p>{s.seller_name ?? profiles?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.seller_whatsapp ? <WhatsAppLink number={s.seller_whatsapp} /> : profiles?.email}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatMinOrder(s.min_order_kg, s.min_order_brl)}</TableCell>
                    <TableCell className="max-w-56">
                      <p className="truncate text-sm">{s.payment_terms ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.delivery_info ?? ""}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{products?.[0]?.count ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "secondary" : "outline"} className="rounded-full">
                        {s.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <SupplierRowActions supplier={supplier} email={profiles?.email} />
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
