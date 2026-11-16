"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { TAGS, userTag } from "@/lib/cache-tags";
import { invalidate } from "@/lib/invalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createCustomerSchema,
  createSupplierSchema,
  parseProductsText,
  resetPasswordSchema,
  supplierSchema,
  type CreateCustomerInput,
  type CreateSupplierInput,
  type ResetPasswordInput,
  type SupplierData,
  type SupplierInput,
} from "@/types/schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

function authErrorMessage(msg: string) {
  if (msg.includes("already been registered") || msg.includes("already exists")) return "Esse e-mail já possui conta.";
  return msg;
}

function supplierRow(d: SupplierData) {
  return {
    name: d.name,
    supplier_type: d.supplier_type || null,
    min_order_kg: d.min_order_kg ?? null,
    min_order_brl: d.min_order_brl ?? null,
    payment_terms: d.payment_terms || null,
    seller_name: d.seller_name,
    seller_whatsapp: d.seller_whatsapp || null,
    delivery_info: d.delivery_info || null,
    notes: d.notes || null,
  };
}

/**
 * Cadastro manual de fornecedor pela equipe: cria o usuário já confirmado, com a
 * senha informada (sem e-mail). O trigger cria o `profile`; aqui criamos `suppliers`
 * e os produtos listados em "Produtos que fornece" (unidade padrão kg).
 */
export async function createSupplier(input: CreateSupplierInput): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const data = parsed.data;
  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { role: "supplier", full_name: data.seller_name },
    app_metadata: { role: "supplier" }, // lido pelo proxy direto do token
  });
  if (error || !created.user) return { ok: false, error: authErrorMessage(error?.message ?? "Falha ao criar usuário") };

  const { data: supplier, error: insertError } = await admin
    .from("suppliers")
    .insert({ profile_id: created.user.id, ...supplierRow(data) })
    .select("id")
    .single();
  if (insertError || !supplier) {
    // Evita usuário órfão
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Falha ao criar cadastro: ${insertError?.message}` };
  }

  const products = parseProductsText(data.products_text);
  if (products.length) {
    const { error: prodError } = await admin
      .from("products")
      .insert(products.map((name) => ({ supplier_id: supplier.id, name, unit: "kg" })));
    if (prodError) return { ok: true, message: `Fornecedor criado, mas falhou ao cadastrar produtos: ${prodError.message}` };
  }

  invalidate(TAGS.suppliers, TAGS.users, TAGS.products, TAGS.ranking);
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message: `Fornecedor cadastrado${products.length ? ` com ${products.length} produto(s)` : ""}. Acesso: ${data.email}`,
  };
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<ActionResult> {
  await requireRole("admin");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "ID inválido" };
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update(supplierRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Produtos novos digitados na edição são adicionados (não remove os existentes).
  const names = parseProductsText(parsed.data.products_text);
  if (names.length) {
    const { error: prodError } = await supabase
      .from("products")
      .upsert(
        names.map((name) => ({ supplier_id: id, name, unit: "kg" })),
        { onConflict: "supplier_id,normalized_name,unit", ignoreDuplicates: true },
      );
    if (prodError) return { ok: false, error: `Fornecedor salvo, mas falhou ao adicionar produtos: ${prodError.message}` };
  }

  invalidate(TAGS.suppliers, TAGS.users, TAGS.products, TAGS.ranking);
  revalidatePath("/admin", "layout");
  revalidatePath("/cliente", "layout");
  return { ok: true, message: "Fornecedor atualizado" };
}

/** Cadastro manual de cliente (restaurante, bar...). */
export async function createCustomer(input: CreateCustomerInput): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const data = parsed.data;
  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { role: "customer", full_name: data.full_name },
    app_metadata: { role: "customer" },
  });
  if (error || !created.user) return { ok: false, error: authErrorMessage(error?.message ?? "Falha ao criar usuário") };

  const { error: insertError } = await admin.from("customers").insert({
    profile_id: created.user.id,
    name: data.name,
    business_type: data.business_type || null,
    cnpj: data.cnpj || null,
    phone: data.phone || null,
    city: data.city || null,
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Falha ao criar cadastro: ${insertError.message}` };
  }

  invalidate(TAGS.customers, TAGS.users);
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Cliente cadastrado. Acesso: ${data.email}` };
}

/** Define uma nova senha para fornecedor ou cliente (a equipe repassa ao usuário). */
export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.profile_id, { password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Senha redefinida" };
}

const toggleSchema = z.object({
  table: z.enum(["suppliers", "customers"]),
  id: z.uuid(),
  is_active: z.boolean(),
});

export async function toggleActive(input: z.infer<typeof toggleSchema>): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from(parsed.data.table)
    .update({ is_active: parsed.data.is_active })
    .eq("id", parsed.data.id)
    .select("profile_id")
    .single();
  if (error) return { ok: false, error: error.message };

  invalidate(parsed.data.table === "suppliers" ? TAGS.suppliers : TAGS.customers, TAGS.users, TAGS.ranking, userTag(row.profile_id));
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/* ---------- Unificação de produtos ---------- */

const linkSchema = z.object({
  product_ids: z.array(z.uuid()).min(1),
  canonical: z.union([
    z.object({ id: z.uuid() }),
    z.object({ name: z.string().min(2), unit: z.string().min(1), category_id: z.uuid().optional() }),
  ]),
});

/** Vincula um ou mais produtos de fornecedores a um produto canônico (existente ou novo). */
export async function linkCanonical(input: z.infer<typeof linkSchema>): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  let canonicalId: string;

  if ("id" in parsed.data.canonical) {
    canonicalId = parsed.data.canonical.id;
  } else {
    const { name, unit, category_id } = parsed.data.canonical;
    const { data, error } = await supabase
      .from("canonical_products")
      .upsert({ name: name.trim(), unit, category_id: category_id ?? null }, { onConflict: "name,unit" })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Falha ao criar produto canônico" };
    canonicalId = data.id;
  }

  const { error } = await supabase.from("products").update({ canonical_id: canonicalId }).in("id", parsed.data.product_ids);
  if (error) return { ok: false, error: error.message };

  invalidate(TAGS.products, TAGS.canonical, TAGS.ranking);
  revalidatePath("/admin/produtos");
  revalidatePath("/cliente", "layout");
  return { ok: true, message: "Produtos unificados" };
}

export async function unlinkCanonical(productId: string): Promise<ActionResult> {
  await requireRole("admin");
  if (!z.uuid().safeParse(productId).success) return { ok: false, error: "ID inválido" };

  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ canonical_id: null }).eq("id", productId);
  if (error) return { ok: false, error: error.message };

  invalidate(TAGS.products, TAGS.canonical, TAGS.ranking);
  revalidatePath("/admin/produtos");
  revalidatePath("/cliente", "layout");
  return { ok: true };
}
