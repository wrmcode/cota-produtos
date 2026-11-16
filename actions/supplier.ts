"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { TAGS } from "@/lib/cache-tags";
import { invalidate } from "@/lib/invalidate";
import { createClient } from "@/lib/supabase/server";
import { productSchema, quotesSchema, type ProductInput, type QuotesInput } from "@/types/schemas";
import type { ActionResult } from "./admin";

async function getSupplierId(): Promise<string> {
  const user = await requireRole("supplier");
  if (!user.supplier) throw new Error("Cadastro de fornecedor não encontrado. Fale com o administrador.");
  return user.supplier.id;
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supplierId = await getSupplierId();
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    supplier_id: supplierId,
    name: parsed.data.name.trim(),
    unit: parsed.data.unit,
    category_id: parsed.data.category_id ?? null,
  });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Você já tem um produto com esse nome e unidade." : error.message };
  }

  invalidate(TAGS.products, TAGS.ranking);
  revalidatePath("/fornecedor", "layout");
  return { ok: true, message: "Produto cadastrado" };
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "ID inválido" };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supplierId = await getSupplierId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ name: parsed.data.name.trim(), unit: parsed.data.unit, category_id: parsed.data.category_id ?? null })
    .eq("id", id)
    .eq("supplier_id", supplierId);
  if (error) return { ok: false, error: error.message };

  invalidate(TAGS.products, TAGS.ranking);
  revalidatePath("/fornecedor", "layout");
  return { ok: true, message: "Produto atualizado" };
}

export async function toggleProduct(id: string, is_active: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "ID inválido" };

  const supplierId = await getSupplierId();
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ is_active }).eq("id", id).eq("supplier_id", supplierId);
  if (error) return { ok: false, error: error.message };

  invalidate(TAGS.products, TAGS.ranking);
  revalidatePath("/fornecedor", "layout");
  return { ok: true };
}

/** Salva (ou sobrescreve) os preços do dia. Linhas em branco são ignoradas. */
export async function saveQuotes(input: QuotesInput): Promise<ActionResult> {
  const parsed = quotesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supplierId = await getSupplierId();
  const supabase = await createClient();

  const rows = parsed.data.lines.map((l) => ({
    product_id: l.product_id,
    supplier_id: supplierId,
    price: l.price,
    quote_date: parsed.data.quote_date,
  }));

  const { error } = await supabase.from("price_quotes").upsert(rows, { onConflict: "product_id,quote_date" });
  if (error) return { ok: false, error: error.message };

  invalidate(TAGS.quotes, TAGS.ranking);
  revalidatePath("/fornecedor", "layout");
  revalidatePath("/cliente", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${rows.length} preço(s) salvo(s)` };
}
