"use client";

import { useState, useTransition } from "react";
import { Link2Off, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { adminToggleProduct, adminUpdateProduct, unlinkCanonical } from "@/actions/admin";
import { ProductDialog } from "@/components/supplier/product-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProductWithSupplier } from "@/lib/queries/admin";
import type { CategoryOption } from "@/lib/queries/categories";

/** Ações do admin em um produto de fornecedor: editar, ativar/desativar e remover unificação. */
export function AdminProductRowActions({ product, categories }: { product: ProductWithSupplier; categories: CategoryOption[] }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { suppliers, canonical_products, product_categories, ...plain } = product;
  void product_categories;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Pronto");
      else toast.error(res.error);
    });

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${product.name}`} title="Editar" disabled={pending} onClick={() => setEditOpen(true)}>
          <Pencil />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Mais ações" disabled={pending} />}>
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(() => adminToggleProduct(product.id, !product.is_active))}>
              {product.is_active ? "Desativar" : "Ativar"}
            </DropdownMenuItem>
            {canonical_products && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => run(() => unlinkCanonical(product.id))}>
                  <Link2Off /> Remover unificação
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProductDialog
        product={plain}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(values) => adminUpdateProduct(product.id, values)}
        description={`Produto de ${suppliers?.name ?? "fornecedor"}. A alteração vale para a cotação e o ranking.`}
      />
    </>
  );
}
