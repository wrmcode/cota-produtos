"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { toggleProduct } from "@/actions/supplier";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CategoryOption } from "@/lib/queries/categories";
import type { Product } from "@/types/database";
import { ProductDialog } from "./product-dialog";

export function ProductRowActions({ product, categories }: { product: Product; categories: CategoryOption[] }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações" disabled={pending} />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                const res = await toggleProduct(product.id, !product.is_active);
                if (res.ok) toast.success(product.is_active ? "Produto desativado" : "Produto ativado");
                else toast.error(res.error);
              })
            }
          >
            {product.is_active ? "Desativar" : "Ativar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProductDialog product={product} categories={categories} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
