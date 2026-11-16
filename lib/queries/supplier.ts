import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { TAGS } from "@/lib/cache-tags";
import { todayISO } from "@/lib/format";
import { createCacheClient } from "@/lib/supabase/cache-client";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { Product, Supplier } from "@/types/database";
import { getAllRankingRows } from "./ranking";

export interface ProductWithCategory extends Product {
  categoryName: string | null;
}

export interface ProductForQuote extends ProductWithCategory {
  todayPrice: number | null;
  lastPrice: number | null;
  lastDate: string | null;
}

type RawProduct = Product & { product_categories: { name: string } | null; suppliers?: Pick<Supplier, "id" | "profile_id"> | null };

function withCategory({ product_categories, suppliers: _s, ...p }: RawProduct): ProductWithCategory {
  void _s;
  return { ...p, categoryName: product_categories?.name ?? null };
}

/**
 * Produtos do fornecedor, filtrados pelo `profile_id` (vem do header assinado
 * pelo proxy, então pode ser usado com o cache client). Cache por fornecedor,
 * invalidado pela tag `products`.
 */
export async function listSupplierProductsByProfile(profileId: string): Promise<ProductWithCategory[]> {
  "use cache";
  cacheTag(TAGS.products, TAGS.categories);
  cacheLife("hours");

  const supabase = createCacheClient();
  const rows = await fetchAll((from, to) =>
    supabase
      .from("products")
      .select("*, product_categories(name), suppliers!inner(id, profile_id)")
      .eq("suppliers.profile_id", profileId)
      .order("name")
      .order("id")
      .range(from, to),
  );
  return (rows as unknown as RawProduct[]).map(withCategory);
}

/** Último preço de cada produto (todos os fornecedores; tabela pequena). */
async function getLatestPrices() {
  "use cache";
  cacheTag(TAGS.quotes);
  cacheLife("hours");

  const supabase = createCacheClient();
  return fetchAll((from, to) => supabase.from("latest_prices").select("product_id, price, quote_date").order("product_id").range(from, to));
}

/** Cotações de um dia específico (a data faz parte da chave do cache). */
async function getQuotesForDate(date: string) {
  "use cache";
  cacheTag(TAGS.quotes);
  cacheLife("hours");

  const supabase = createCacheClient();
  return fetchAll((from, to) => supabase.from("price_quotes").select("product_id, price").eq("quote_date", date).order("id").range(from, to));
}

/** Produtos ativos com o preço de hoje (se houver) e o último preço informado. */
export async function getProductsForQuoteByProfile(profileId: string): Promise<ProductForQuote[]> {
  await connection(); // garante contexto dinâmico antes de ler a data de hoje
  const today = todayISO();
  const [products, latest, todays] = await Promise.all([
    listSupplierProductsByProfile(profileId),
    getLatestPrices(),
    getQuotesForDate(today),
  ]);

  const latestMap = new Map(latest.map((l) => [l.product_id, l]));
  const todayMap = new Map(todays.map((t) => [t.product_id, Number(t.price)]));

  return products
    .filter((p) => p.is_active)
    .map((p) => {
      const l = latestMap.get(p.id);
      return {
        ...p,
        todayPrice: todayMap.get(p.id) ?? null,
        lastPrice: l ? Number(l.price) : null,
        lastDate: l?.quote_date ?? null,
      };
    });
}

/** Posição do fornecedor no ranking de cada produto dele (entre todos os fornecedores). */
export async function getSupplierPositions(supplierId: string) {
  const all = await getAllRankingRows();
  const totals = new Map<string, number>();
  for (const r of all) totals.set(r.group_key, (totals.get(r.group_key) ?? 0) + 1);
  return new Map(
    all
      .filter((r) => r.supplier_id === supplierId)
      .map((r) => [r.product_id, { position: r.position, total: totals.get(r.group_key) ?? 1 }] as const),
  );
}
