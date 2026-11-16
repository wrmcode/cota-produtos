"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateSupplier } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Supplier } from "@/types/database";
import { supplierSchema, type SupplierInput } from "@/types/schemas";
import { SupplierFields } from "./supplier-fields";

function toDefaults(s: Supplier): SupplierInput {
  return {
    name: s.name,
    supplier_type: s.supplier_type ?? "",
    min_order_kg: s.min_order_kg ?? ("" as unknown as number),
    min_order_brl: s.min_order_brl ?? ("" as unknown as number),
    payment_terms: s.payment_terms ?? "",
    seller_name: s.seller_name ?? "",
    seller_whatsapp: s.seller_whatsapp ?? "",
    delivery_info: s.delivery_info ?? "",
    notes: s.notes ?? "",
    products_text: "",
  };
}

/** Edição de fornecedor (o cadastro é feito na página /admin/fornecedores/novo). */
export function SupplierDialog({
  supplier,
  open,
  onOpenChange,
}: {
  supplier: Supplier;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<SupplierInput>({ resolver: zodResolver(supplierSchema), defaultValues: toDefaults(supplier) });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  useEffect(() => {
    if (open) reset(toDefaults(supplier));
  }, [open, supplier, reset]);

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateSupplier(supplier.id, values);
      if (res.ok) {
        toast.success(res.message);
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={onSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Editar fornecedor</DialogTitle>
            <DialogDescription>Os dados abaixo aparecem para os clientes junto com a lista de preços.</DialogDescription>
          </DialogHeader>
          <SupplierFields register={register} errors={errors} editing />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
