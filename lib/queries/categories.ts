import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { createCacheClient } from "@/lib/supabase/cache-client";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { ProductCategory } from "@/types/database";

export type CategoryOption = Pick<ProductCategory, "id" | "name">;

/** Categorias para seleção (ordem definida pelo admin, depois alfabética). */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  "use cache";
  cacheTag(TAGS.categories);
  cacheLife("hours");

  const { data } = await createCacheClient().from("product_categories").select("id, name").order("sort_order").order("name");
  return data ?? [];
}

export interface CategoryWithCount extends ProductCategory {
  productCount: number;
}

/** Para o admin: todas as categorias com a quantidade de produtos vinculados. */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  "use cache";
  cacheTag(TAGS.categories, TAGS.products);
  cacheLife("hours");

  const supabase = createCacheClient();
  const [{ data: cats }, prods] = await Promise.all([
    supabase.from("product_categories").select("*").order("sort_order").order("name"),
    fetchAll((from, to) => supabase.from("products").select("category_id").not("category_id", "is", null).order("id").range(from, to)),
  ]);
  const counts = new Map<string, number>();
  for (const p of prods) if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  return (cats ?? []).map((c) => ({ ...c, productCount: counts.get(c.id) ?? 0 }));
}
