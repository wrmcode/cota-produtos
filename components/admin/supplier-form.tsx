"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createSupplier } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { generatePassword } from "@/lib/password";
import { createSupplierSchema, type CreateSupplierInput, type SupplierInput } from "@/types/schemas";
import { CredentialsFields } from "./credentials-fields";
import { SupplierFields } from "./supplier-fields";

/** Página de cadastro manual de fornecedor (equipe define e-mail e senha). */
export function SupplierForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      email: "",
      password: generatePassword(),
      name: "",
      supplier_type: "",
      min_order_kg: "" as unknown as number,
      min_order_brl: "" as unknown as number,
      payment_terms: "",
      seller_name: "",
      seller_whatsapp: "",
      delivery_info: "",
      notes: "",
      products_text: "",
    },
  });
  const { register, handleSubmit, setValue, formState: { errors } } = form;

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await createSupplier(values);
      if (res.ok) {
        toast.success(res.message, { duration: 8000 });
        router.push("/admin/fornecedores");
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/5 sm:p-6">
        <h2 className="font-heading text-base font-semibold">Dados do fornecedor</h2>
        <p className="mb-5 text-xs text-muted-foreground">Aparecem para os clientes junto com a lista de preços.</p>
        <SupplierFields
          register={register as unknown as UseFormRegister<SupplierInput>}
          errors={errors as FieldErrors<SupplierInput>}
        />
      </section>

      <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/5 sm:p-6">
        <h2 className="font-heading text-base font-semibold">Acesso ao sistema</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Com esses dados o vendedor entra para enviar a cotação diária. Nenhum e-mail é enviado.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <CredentialsFields register={register} errors={errors} setValue={setValue} emailLabel="E-mail do vendedor (login)" />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" render={<Link href="/admin/fornecedores" />}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Cadastrando..." : "Cadastrar fornecedor"}
        </Button>
      </div>
    </form>
  );
}
