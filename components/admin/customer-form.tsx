"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createCustomer } from "@/actions/admin";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { generatePassword } from "@/lib/password";
import { BUSINESS_TYPES, createCustomerSchema, type CreateCustomerInput } from "@/types/schemas";
import { CredentialsFields } from "./credentials-fields";

/** Página de cadastro manual de cliente (restaurante, bar...). */
export function CustomerForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: { email: "", password: generatePassword(), name: "", full_name: "", business_type: "", cnpj: "", phone: "", city: "" },
  });
  const { register, handleSubmit, setValue, formState: { errors } } = form;

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await createCustomer(values);
      if (res.ok) {
        toast.success(res.message, { duration: 8000 });
        router.push("/admin/clientes");
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/5 sm:p-6">
        <h2 className="font-heading text-base font-semibold">Dados do estabelecimento</h2>
        <p className="mb-5 text-xs text-muted-foreground">Restaurante, bar, lanchonete ou outro negócio que vai consultar os preços.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome do estabelecimento" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Restaurante Sabor" autoFocus />
          </Field>
          <Field label="Tipo" error={errors.business_type?.message}>
            <NativeSelect {...register("business_type")}>
              <option value="">Selecione…</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Nome do responsável" error={errors.full_name?.message}>
            <Input {...register("full_name")} placeholder="Quem vai usar o sistema" />
          </Field>
          <Field label="Cidade" error={errors.city?.message}>
            <Input {...register("city")} />
          </Field>
          <Field label="CNPJ" error={errors.cnpj?.message}>
            <Input {...register("cnpj")} inputMode="numeric" />
          </Field>
          <Field label="Telefone / WhatsApp" error={errors.phone?.message}>
            <Input {...register("phone")} inputMode="tel" />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/5 sm:p-6">
        <h2 className="font-heading text-base font-semibold">Acesso ao sistema</h2>
        <p className="mb-5 text-xs text-muted-foreground">Com esses dados o cliente entra para ver o ranking de preços. Nenhum e-mail é enviado.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <CredentialsFields register={register} errors={errors} setValue={setValue} emailLabel="E-mail do responsável (login)" />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" render={<Link href="/admin/clientes" />}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Cadastrando..." : "Cadastrar cliente"}
        </Button>
      </div>
    </form>
  );
}
