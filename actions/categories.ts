"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { TAGS } from "@/lib/cache-tags";
import { invalidate } from "@/lib/invalidate";
import { createClient } from "@/lib/supabase/server";
import { categorySchema, type CategoryInput } from "@/types/schemas";
import type { ActionResult } from "./admin";

function revalidateCategories() {
  invalidate(TAGS.categories, TAGS.products, TAGS.ranking);
  revalidatePath("/admin/categorias");
  revalidatePath("/fornecedor", "layout");
  revalidatePath("/cliente", "layout");
}

function duplicateMessage(code: string | undefined, fallback: string) {
  return code === "23505" ? "Já existe uma categoria com esse nome (a comparação ignora acentos e maiúsculas)." : fallback;
}

export async function createCategory(input: CategoryInput): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data: last } = await supabase.from("product_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("product_categories").insert({ name: parsed.data.name, sort_order: (last?.sort_order ?? 0) + 10 });
  if (error) return { ok: false, error: duplicateMessage(error.code, error.message) };

  revalidateCategories();
  return { ok: true, message: "Categoria criada" };
}

export async function renameCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  await requireRole("admin");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "ID inválido" };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("product_categories").update({ name: parsed.data.name }).eq("id", id);
  if (error) return { ok: false, error: duplicateMessage(error.code, error.message) };

  revalidateCategories();
  return { ok: true, message: "Categoria renomeada" };
}

/**
 * Remove a categoria. Produtos vinculados ficam "sem categoria" (FK on delete set null),
 * ou são movidos para `moveToId` se informado.
 */
export async function deleteCategory(id: string, moveToId?: string): Promise<ActionResult> {
  await requireRole("admin");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "ID inválido" };
  if (moveToId && (!z.uuid().safeParse(moveToId).success || moveToId === id)) return { ok: false, error: "Categoria de destino inválida" };

  const supabase = await createClient();
  if (moveToId) {
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("products").update({ category_id: moveToId }).eq("category_id", id),
      supabase.from("canonical_products").update({ category_id: moveToId }).eq("category_id", id),
    ]);
    if (e1 || e2) return { ok: false, error: (e1 ?? e2)?.message };
  }

  const { error } = await supabase.from("product_categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateCategories();
  return { ok: true, message: moveToId ? "Categoria removida e produtos movidos" : "Categoria removida" };
}
