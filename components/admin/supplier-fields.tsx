"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Field } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { SUPPLIER_TYPES, type SupplierInput } from "@/types/schemas";

/** Campos do fornecedor (mesmo layout da referência), compartilhados por cadastro e edição. */
export function SupplierFields({
  register,
  errors,
  editing = false,
}: {
  register: UseFormRegister<SupplierInput>;
  errors: FieldErrors<SupplierInput>;
  editing?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Nome" error={errors.name?.message}>
        <Input {...register("name")} placeholder="Alvorada Norte" autoFocus />
      </Field>
      <Field label="Tipo" error={errors.supplier_type?.message}>
        <NativeSelect {...register("supplier_type")}>
          <option value="">Selecione…</option>
          {SUPPLIER_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Pedido mínimo em kg" error={errors.min_order_kg?.message}>
        <Input {...register("min_order_kg")} inputMode="decimal" placeholder="Ex.: 30 (deixe vazio se não tiver)" />
      </Field>
      <Field label="Pedido mínimo em R$" error={errors.min_order_brl?.message}>
        <Input {...register("min_order_brl")} inputMode="decimal" placeholder="Ex.: 500 (deixe vazio se não tiver)" />
      </Field>

      <Field label="Prazo de pagamento" error={errors.payment_terms?.message}>
        <Input {...register("payment_terms")} placeholder="Ex.: 7 dias, boleto" />
      </Field>
      <Field label="Vendedor que envia a cotação" error={errors.seller_name?.message}>
        <Input {...register("seller_name")} placeholder="Nome" />
      </Field>
      <Field label="WhatsApp do vendedor" error={errors.seller_whatsapp?.message}>
        <Input {...register("seller_whatsapp")} inputMode="tel" placeholder="63992132267" />
      </Field>
      <Field label="Entrega" error={errors.delivery_info?.message}>
        <Input {...register("delivery_info")} placeholder="Ex.: seg a sáb, até 11h" />
      </Field>

      <Field label="Observações sobre o fornecedor" error={errors.notes?.message} className="sm:col-span-2 lg:col-span-4">
        <Input {...register("notes")} placeholder="Ex.: só retirada na loja, telefone fixo…" />
      </Field>

      <Field
        label={editing ? "Adicionar produtos" : "Produtos que fornece"}
        error={errors.products_text?.message}
        hint="Entram com unidade kg; o fornecedor ajusta a unidade em “Meus produtos”."
        className="sm:col-span-2 lg:col-span-4"
      >
        <Textarea
          {...register("products_text")}
          rows={5}
          placeholder={editing ? "Novos produtos, um por linha ou separados por vírgula" : "Um por linha ou separados por vírgula"}
        />
      </Field>
    </div>
  );
}
