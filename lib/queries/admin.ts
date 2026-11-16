import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { TAGS } from "@/lib/cache-tags";
import { todayISO } from "@/lib/format";
import { createCacheClient } from "@/lib/supabase/cache-client";
import type { Customer, Product, Supplier } from "@/types/database";

export interface SupplierWithProfile extends Supplier {
  profiles: { email: string | null; full_name: string | null } | null;
  products: { count: number }[];
}

export interface CustomerWithProfile extends Customer {
  profiles: { email: string | null; full_name: string | null } | null;
}

/** Contadores do dashboard. A data faz parte da chave do cache (muda à meia-noite). */
async function getAdminStatsFor(today: string) {
  "use cache";
  cacheTag(TAGS.suppliers, TAGS.customers, TAGS.products, TAGS.quotes);
  cacheLife("hours");

  const supabase = createCacheClient();
  const [suppliers, customers, products, quotesToday, suppliersQuotedToday] = await Promise.all([
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("price_quotes").select("id", { count: "exact", head: true }).eq("quote_date", today),
    supabase.from("price_quotes").select("supplier_id").eq("quote_date", today),
  ]);

  const distinctSuppliers = new Set((suppliersQuotedToday.data ?? []).map((r) => r.supplier_id)).size;

  return {
    suppliers: suppliers.count ?? 0,
    customers: customers.count ?? 0,
    products: products.count ?? 0,
    quotesToday: quotesToday.count ?? 0,
    suppliersQuotedToday: distinctSuppliers,
  };
}

// `connection()` antes de ler a data: com tudo em cache, nada mais marca a página
// como dinâmica antes do `new Date()`, e o Next exige isso no prerender.
export async function getAdminStats() {
  await connection();
  return getAdminStatsFor(todayISO());
}

async function getSuppliersMissingFor(today: string) {
  "use cache";
  cacheTag(TAGS.suppliers, TAGS.quotes);
  cacheLife("hours");

  const supabase = createCacheClient();
  const [{ data: suppliers }, { data: quoted }] = await Promise.all([
    supabase.from("suppliers").select("id, name, city").eq("is_active", true).order("name"),
    supabase.from("price_quotes").select("supplier_id").eq("quote_date", today),
  ]);
  const quotedSet = new Set((quoted ?? []).map((q) => q.supplier_id));
  return (suppliers ?? []).filter((s) => !quotedSet.has(s.id));
}

export async function getSuppliersMissingToday() {
  await connection();
  return getSuppliersMissingFor(todayISO());
}

export async function getRecentQuotes(limit = 10) {
  "use cache";
  cacheTag(TAGS.quotes, TAGS.products, TAGS.suppliers);
  cacheLife("hours");

  const { data } = await createCacheClient()
    .from("price_quotes")
    .select("id, price, quote_date, created_at, products(name, unit), suppliers(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listSuppliers(): Promise<SupplierWithProfile[]> {
  "use cache";
  cacheTag(TAGS.suppliers, TAGS.users, TAGS.products);
  cacheLife("hours");

  const { data } = await createCacheClient()
    .from("suppliers")
    .select("*, profiles(email, full_name), products(count)")
    .order("created_at", { ascending: false });
  return (data ?? []) as SupplierWithProfile[];
}

export async function listCustomers(): Promise<CustomerWithProfile[]> {
  "use cache";
  cacheTag(TAGS.customers, TAGS.users);
  cacheLife("hours");

  const { data } = await createCacheClient()
    .from("customers")
    .select("*, profiles(email, full_name)")
    .order("created_at", { ascending: false });
  return (data ?? []) as CustomerWithProfile[];
}

export interface ProductWithSupplier extends Product {
  suppliers: { name: string } | null;
  canonical_products: { id: string; name: string; unit: string } | null;
  product_categories: { name: string } | null;
}

export async function listAllProducts(): Promise<ProductWithSupplier[]> {
  "use cache";
  cacheTag(TAGS.products, TAGS.suppliers, TAGS.canonical, TAGS.categories);
  cacheLife("hours");

  const { data } = await createCacheClient()
    .from("products")
    .select("*, suppliers(name), canonical_products(id, name, unit), product_categories(name)")
    .eq("is_active", true)
    .order("normalized_name");
  return (data ?? []) as ProductWithSupplier[];
}

export async function listCanonicalProducts() {
  "use cache";
  cacheTag(TAGS.canonical);
  cacheLife("hours");

  const { data } = await createCacheClient().from("canonical_products").select("*").order("name");
  return data ?? [];
}
