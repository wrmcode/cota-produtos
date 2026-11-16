import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, Scale, Store, Truck } from "lucide-react";
import { SupplierTypeBadge } from "@/components/customer/supplier-info";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { requireRole } from "@/lib/auth";
import { formatMinOrder } from "@/lib/format";
import { getSupplierSummaries, listActiveSuppliers } from "@/lib/queries/customer";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function CustomerSuppliersPage() {
  const [, suppliers, stats] = await Promise.all([requireRole("customer"), listActiveSuppliers(), getSupplierSummaries()]);

  return (
    <>
      <PageHeader title="Fornecedores" description="Condições comerciais e lista de preços de cada fornecedor." />

      {suppliers.length === 0 ? (
        <div className="rounded-2xl bg-card ring-1 ring-foreground/5">
          <EmptyState icon={Store} title="Nenhum fornecedor ativo" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => {
            const st = stats.get(s.id);
            return (
              <article key={s.id} className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading font-semibold">{s.name}</p>
                      <SupplierTypeBadge type={s.supplier_type} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.seller_name ?? "—"}
                      {s.seller_whatsapp && (
                        <>
                          {" · "}
                          <WhatsAppLink number={s.seller_whatsapp} />
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/cliente?fornecedor=${s.id}`}
                    aria-label={`Ver preços de ${s.name}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </div>

                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Scale className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{formatMinOrder(s.min_order_kg, s.min_order_brl)}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{s.payment_terms ?? "Pagamento a combinar"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Truck className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{s.delivery_info ?? "Entrega a combinar"}</span>
                  </li>
                </ul>

                <dl className="grid grid-cols-2 gap-2 border-t pt-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Produtos cotados</dt>
                    <dd className="font-semibold tabular-nums">{st?.products ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Melhor preço em</dt>
                    <dd className="font-semibold tabular-nums">{st?.firsts ?? 0}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
