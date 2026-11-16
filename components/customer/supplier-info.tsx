import { Clock, CreditCard, Scale, Truck, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatMinOrder } from "@/lib/format";
import type { SupplierPublic } from "@/lib/queries/customer";
import { cn } from "@/lib/utils";

/** Condições comerciais do fornecedor, exibidas para o cliente. */
export function SupplierInfo({ supplier, className }: { supplier: SupplierPublic; className?: string }) {
  const items: { icon: LucideIcon; label: string; value: React.ReactNode }[] = [
    { icon: Scale, label: "Pedido mínimo", value: formatMinOrder(supplier.min_order_kg, supplier.min_order_brl) },
    { icon: CreditCard, label: "Pagamento", value: supplier.payment_terms ?? "A combinar" },
    { icon: Truck, label: "Entrega", value: supplier.delivery_info ?? "A combinar" },
    {
      icon: User,
      label: "Vendedor",
      value: supplier.seller_name ? (
        <>
          {supplier.seller_name}
          {supplier.seller_whatsapp && (
            <>
              {" · "}
              <WhatsAppLink number={supplier.seller_whatsapp} />
            </>
          )}
        </>
      ) : (
        "—"
      ),
    },
  ];

  return (
    <dl className={cn("grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-2 rounded-2xl bg-muted/60 px-3 py-2.5">
          <Icon className="mt-0.5 size-4 shrink-0 text-brand" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate font-medium">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function SupplierTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
      <Clock className="hidden" />
      {type}
    </span>
  );
}
