import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { createCacheClient } from "@/lib/supabase/cache-client";
import type { ProductRankingRow, Supplier } from "@/types/database";
import { getAllRankingRows } from "./ranking";

export interface RankingGroup {
  key: string;
  productName: string;
  unit: string;
  category: string | null;
  rows: ProductRankingRow[];
  bestPrice: number;
  worstPrice: number;
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function groupRanking(rows: ProductRankingRow[]): RankingGroup[] {
  const map = new Map<string, ProductRankingRow[]>();
  for (const r of rows) {
    const list = map.get(r.group_key);
    if (list) list.push(r);
    else map.set(r.group_key, [r]);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => a.position - b.position);
      const prices = sorted.map((r) => r.price);
      return {
        key,
        productName: sorted[0].product_name,
        unit: sorted[0].unit,
        category: sorted[0].category,
        rows: sorted,
        bestPrice: Math.min(...prices),
        worstPrice: Math.max(...prices),
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
}

/**
 * Ranking de todos os produtos. `groupKey` restringe a um único produto
 * (clique no card); `search` filtra por texto (sem acento/maiúsculas).
 */
export async function getRanking(opts: { search?: string; groupKey?: string } = {}): Promise<RankingGroup[]> {
  let rows = await getAllRankingRows();
  if (opts.groupKey) rows = rows.filter((r) => r.group_key === opts.groupKey);
  else if (opts.search?.trim()) {
    const q = normalize(opts.search.trim());
    rows = rows.filter((r) => normalize(r.product_name).includes(q));
  }
  return groupRanking(rows);
}

/** Lista de um fornecedor específico, com a posição dele e o melhor preço do mercado em cada produto. */
export async function getSupplierList(supplierId: string, search?: string) {
  const all = await getAllRankingRows();
  const q = search?.trim() ? normalize(search.trim()) : "";

  const best = new Map<string, { price: number; supplier: string }>();
  const totals = new Map<string, number>();
  for (const r of all) {
    totals.set(r.group_key, (totals.get(r.group_key) ?? 0) + 1);
    if (r.position === 1 && !best.has(r.group_key)) best.set(r.group_key, { price: r.price, supplier: r.supplier_name });
  }

  return all
    .filter((r) => r.supplier_id === supplierId && (!q || normalize(r.product_name).includes(q)))
    .sort((a, b) => a.product_name.localeCompare(b.product_name, "pt-BR"))
    .map((r) => ({
      ...r,
      best: best.get(r.group_key) ?? null,
      competitors: totals.get(r.group_key) ?? 1,
    }));
}

export const SUPPLIER_PUBLIC_FIELDS =
  "id, name, city, supplier_type, min_order_kg, min_order_brl, payment_terms, seller_name, seller_whatsapp, delivery_info" as const;

export type SupplierPublic = Pick<
  Supplier,
  "id" | "name" | "city" | "supplier_type" | "min_order_kg" | "min_order_brl" | "payment_terms" | "seller_name" | "seller_whatsapp" | "delivery_info"
>;

/** Fornecedores ativos com as condições comerciais visíveis ao cliente (cache compartilhado). */
export async function listActiveSuppliers(): Promise<SupplierPublic[]> {
  "use cache";
  cacheTag(TAGS.suppliers);
  cacheLife("hours");

  const { data } = await createCacheClient().from("suppliers").select(SUPPLIER_PUBLIC_FIELDS).eq("is_active", true).order("name");
  return data ?? [];
}

export async function getCustomerStats() {
  const [rows, suppliers] = await Promise.all([getAllRankingRows(), listActiveSuppliers()]);
  const groups = new Set(rows.map((r) => r.group_key)).size;
  const latestDate = rows.reduce<string | null>((acc, r) => (!acc || r.quote_date > acc ? r.quote_date : acc), null);
  return { products: groups, suppliers: suppliers.length, quotes: rows.length, latestDate };
}

/** Resumo por fornecedor para os cards de /cliente/fornecedores. */
export async function getSupplierSummaries() {
  const rows = await getAllRankingRows();
  const stats = new Map<string, { products: number; firsts: number; latest: string | null }>();
  for (const r of rows) {
    const s = stats.get(r.supplier_id) ?? { products: 0, firsts: 0, latest: null };
    s.products += 1;
    if (r.position === 1) s.firsts += 1;
    if (!s.latest || r.quote_date > s.latest) s.latest = r.quote_date;
    stats.set(r.supplier_id, s);
  }
  return stats;
}
