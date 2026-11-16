"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { ALL_TAGS } from "@/lib/cache-tags";
import { invalidate } from "@/lib/invalidate";
import type { ActionResult } from "./admin";

/**
 * Limpa todo o cache de dados e força releitura do Supabase.
 * Útil depois de mexer direto no banco (SQL Editor, seed) ou se algo parecer desatualizado.
 */
export async function refreshAllCaches(): Promise<ActionResult> {
  await requireRole("admin");
  invalidate(...ALL_TAGS);
  revalidatePath("/", "layout");
  const when = new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date());
  return { ok: true, message: `Dados atualizados do Supabase às ${when}` };
}
