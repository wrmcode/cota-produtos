"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createProduct, updateProduct } from "@/actions/supplier";
import { CategoryCombobox } from "@/components/category-combobox";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { CategoryOption } from "@/lib/queries/categories";
import type { Product } from "@/types/database";
import { productSchema, UNITS, type ProductInput } from "@/types/schemas";

function toDefaults(product?: Product): ProductInput {
  return { name: product?.name ?? "", unit: product?.unit ?? "kg", category_id: product?.category_id ?? "" };
}

export function ProductDialog({
  product,
  categories,
  open: controlledOpen,
  onOpenChange,
}: {
  product?: Product;
  categories: CategoryOption[];
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();
  const editing = Boolean(product);

  const form = useForm<ProductInput>({ resolver: zodResolver(productSchema), defaultValues: toDefaults(product) });
  const { register, control, handleSubmit, reset, formState: { errors } } = form;

  useEffect(() => {
    if (open) reset(toDefaults(product));
  }, [open, product, reset]);

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = product ? await updateProduct(product.id, values) : await createProduct(values);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editing && (
        <DialogTrigger render={<Button />}>
          <Plus />
          Novo produto
        </DialogTrigger>
      )}
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>Use o nome mais comum do item. Ex.: “Peito de frango”, “Tomate italiano”.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Field label="Nome" error={errors.name?.message}>
              <Input {...register("name")} autoFocus />
            </Field>
            <Field label="Unidade" error={errors.unit?.message}>
              <NativeSelect {...register("unit")}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Categoria"
              error={errors.category_id?.message}
              hint="Escolha entre as categorias definidas pelo administrador."
              className="sm:col-span-2"
            >
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <CategoryCombobox
                    id="category_id"
                    categories={categories}
                    value={typeof field.value === "string" ? field.value : null}
                    onChange={(id) => field.onChange(id ?? "")}
                  />
                )}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
