import { createServerClient } from "@supabase/ssr";
import { connection } from "next/server";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Client Supabase para Server Components, Server Actions e Route Handlers.
 * Usa os cookies da requisição para identificar o usuário (RLS aplicado).
 *
 * `connection()` marca o que vem depois como "request time" — exigência do
 * Cache Components do Next 16, já que a lib do Supabase usa Date.now() internamente.
 */
export async function createClient() {
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component: os cookies são atualizados pelo proxy.
        }
      },
    },
  });
}
