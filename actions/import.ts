"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { TAGS } from "@/lib/cache-tags";
import { todayISO } from "@/lib/format";
import { extractQuotes } from "@/lib/import/extract";
import type { Extraction } from "@/lib/import/schema";
import { invalidate } from "@/lib/invalidate";
import { listCategoryOptions } from "@/lib/queries/categories";
import {
  listSupplierProductOptions,
  listSuppliers,
  type ProductOption,
} from "@/lib/queries/admin";
import { normalizeText } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { importCommitSchema, type ImportCommitInput } from "@/types/schemas";
import type { ActionResult } from "./admin";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export type ExtractResult =
  | {
      ok: true;
      data: Extraction;
      model: string;
      usage: { input: number; output: number };
    }
  | { ok: false; error: string };

/** Passo 1: lê texto/arquivos enviados e devolve os itens interpretados pelo modelo. */
export async function extractImport(
  formData: FormData,
): Promise<ExtractResult> {
  await requireRole("admin");

  const text = String(formData.get("text") ?? "");
  const rawFiles = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (rawFiles.length > MAX_FILES)
    return {
      ok: false,
      error: `Envie no máximo ${MAX_FILES} arquivos por vez.`,
    };
  for (const f of rawFiles) {
    if (f.size > MAX_FILE_BYTES)
      return { ok: false, error: `${f.name} passa de 20 MB.` };
  }
  if (!text.trim() && rawFiles.length === 0)
    return { ok: false, error: "Cole um texto ou envie ao menos um arquivo." };

  const [files, suppliers, categories] = await Promise.all([
    Promise.all(
      rawFiles.map(async (f) => ({
        name: f.name,
        type: f.type,
        buffer: Buffer.from(await f.arrayBuffer()),
      })),
    ),
    listSuppliers(),
    listCategoryOptions(),
  ]);

  try {
    const result = await extractQuotes(
      { text, files },
      {
        suppliers: suppliers
          .filter((s) => s.is_active)
          .map((s) => ({
            id: s.id,
            name: s.name,
            city: s.city,
            supplier_type: s.supplier_type,
          })),
        categories,
        today: todayISO(),
      },
    );
    return { ok: true, ...result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Falha ao interpretar o conteúdo.";
    return { ok: false, error: message };
  }
}

/** Produtos do fornecedor escolhido, para casar linhas importadas com o catálogo. */
export async function getSupplierProductOptions(
  supplierId: string,
): Promise<ProductOption[]> {
  await requireRole("admin");
  if (!z.uuid().safeParse(supplierId).success) return [];
  return listSupplierProductOptions(supplierId);
}

export interface CommitSummary {
  created: number;
  reused: number;
  quotes: number;
}

/** Passo 2: cria os produtos novos e grava as cotações aprovadas pelo admin. */
export async function commitImport(
  input: ImportCommitInput,
): Promise<ActionResult & { summary?: CommitSummary }> {
  await requireRole("admin");
  const parsed = importCommitSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  const { supplier_id, quote_date, rows } = parsed.data;

  const supabase = await createClient();
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", supplier_id)
    .maybeSingle();
  if (!supplier) return { ok: false, error: "Fornecedor não encontrado." };

  // Catálogo atual do fornecedor (direto do banco, sem cache) para reaproveitar produtos iguais.
  const { data: existing, error: listError } = await supabase
    .from("products")
    .select("id, unit, normalized_name")
    .eq("supplier_id", supplier_id);
  if (listError) return { ok: false, error: listError.message };
  const byKey = new Map(
    existing.map((p) => [`${p.normalized_name}|${p.unit}`, p.id]),
  );
  const validIds = new Set(existing.map((p) => p.id));

  let created = 0;
  let reused = 0;
  const quoteRows: {
    product_id: string;
    supplier_id: string;
    price: number;
    quote_date: string;
  }[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    let productId =
      row.product_id && validIds.has(row.product_id)
        ? row.product_id
        : undefined;
    if (!productId) {
      const key = `${normalizeText(row.name)}|${row.unit}`;
      productId = byKey.get(key);
      if (productId) {
        reused += 1;
      } else {
        const { data: inserted, error } = await supabase
          .from("products")
          .insert({
            supplier_id,
            name: row.name,
            unit: row.unit,
            category_id: row.category_id ?? null,
          })
          .select("id")
          .single();
        if (error || !inserted)
          return {
            ok: false,
            error: `Falha ao criar "${row.name}": ${error?.message ?? "erro desconhecido"}`,
          };
        productId = inserted.id;
        byKey.set(key, productId);
        created += 1;
      }
    } else {
      reused += 1;
    }
    if (seen.has(productId)) continue; // duas linhas para o mesmo produto: fica a primeira
    seen.add(productId);
    quoteRows.push({
      product_id: productId,
      supplier_id,
      price: row.price,
      quote_date,
    });
  }

  const { error: quoteError } = await supabase
    .from("price_quotes")
    .upsert(quoteRows, { onConflict: "product_id,quote_date" });
  if (quoteError) return { ok: false, error: quoteError.message };

  invalidate(TAGS.products, TAGS.quotes, TAGS.ranking);
  revalidatePath("/admin", "layout");
  revalidatePath("/fornecedor", "layout");
  revalidatePath("/cliente", "layout");
  return {
    ok: true,
    message: `${quoteRows.length} cotação(ões) salva(s) · ${created} produto(s) novo(s)`,
    summary: { created, reused, quotes: quoteRows.length },
  };
}
