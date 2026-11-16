import "server-only";
import { updateTag } from "next/cache";
import type { CacheTag } from "./cache-tags";

/**
 * Invalida tags do cache de dados dentro de uma Server Action.
 * `updateTag` expira na hora (read-your-own-writes): quem salvou já vê o dado novo.
 */
export function invalidate(...tags: (CacheTag | string)[]) {
  for (const t of new Set(tags)) updateTag(t);
}
