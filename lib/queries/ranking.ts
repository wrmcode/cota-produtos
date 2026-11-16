import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { createCacheClient } from "@/lib/supabase/cache-client";
import { fetchAll } from "@/lib/supabase/fetch-all";
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

  const supabase = createCacheClient();
  const rows = await fetchAll((from, to) =>
    supabase.from("product_ranking").select("*").order("product_name").order("position").order("product_id").range(from, to),
  );
  return rows.map((r) => ({ ...r, price: Number(r.price) }));
}
