import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { createCacheClient } from "@/lib/supabase/cache-client";
import type { ProductRankingRow } from "@/types/database";

/**
 * Todas as linhas da view `product_ranking`, em cache compartilhado entre
 * requests e usuários. Invalidada (tag `ranking`) quando alguém envia cotação,
 * altera produto/fornecedor/categoria ou unifica produtos.
 *
 * A view é pequena (produtos × fornecedores). Se crescer muito, trocar por
 * consultas filtradas no servidor.
 */
export async function getAllRankingRows(): Promise<ProductRankingRow[]> {
  "use cache";
  cacheTag(TAGS.ranking);
  cacheLife("hours");

  const { data } = await createCacheClient().from("product_ranking").select("*").order("product_name").order("position");
  return (data ?? []).map((r) => ({ ...r, price: Number(r.price) }));
}
