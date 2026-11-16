import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

let client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Client usado SOMENTE dentro de funções `"use cache"` (lib/queries/*).
 *
 * Por que não o client com cookies? Dentro de `"use cache"` o Next proíbe ler
 * cookies/headers (o resultado é compartilhado entre requests e usuários), então
 * não há sessão do usuário ali. Este client usa a service role e, portanto,
 * NÃO passa pelo RLS. Regras para usá-lo com segurança:
 *
 *  1. Só leitura. Mutações continuam em Server Actions com `createClient()` (RLS).
 *  2. Só dados que todo usuário autenticado já pode ler (ranking, fornecedores
 *     ativos, categorias, produtos) ou filtrados por um id que veio de fonte
 *     confiável (`getSessionIdentity()` → header assinado pelo proxy).
 *  3. Toda página que chama essas funções passa antes por `requireRole()`.
 */
export function createCacheClient() {
  client ??= createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
