/**
 * Tags do cache de dados (`"use cache"` + `cacheTag`). Cada mutação chama
 * `invalidate(...)` com as tags afetadas; o admin pode limpar tudo pelo botão
 * "Atualizar dados" (actions/cache.ts).
 *
 * Mantenha a lista enxuta: uma tag por "conjunto de dados", não por consulta.
 */
export const TAGS = {
  /** view product_ranking (depende de produtos, fornecedores, cotações, canônicos, categorias) */
  ranking: "ranking",
  suppliers: "suppliers",
  customers: "customers",
  products: "products",
  canonical: "canonical",
  categories: "categories",
  quotes: "quotes",
  /** perfil + cadastro do usuário logado (getCurrentUser) */
  users: "users",
} as const;

export type CacheTag = (typeof TAGS)[keyof typeof TAGS];

export const ALL_TAGS: CacheTag[] = Object.values(TAGS);

/** Tag por usuário, para invalidar só o perfil de uma pessoa. */
export const userTag = (userId: string) => `user:${userId}`;
