"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { encodeViewAs, VIEW_AS_COOKIE, VIEW_AS_HOME, type ViewAsKind } from "@/lib/view-as";

const schema = z.object({ kind: z.enum(["supplier", "customer"]), id: z.uuid() });

/** Admin passa a navegar como o fornecedor/cliente escolhido (cookie httpOnly). */
export async function startViewAs(kind: ViewAsKind, id: string): Promise<never> {
  await requireRole("admin");
  const parsed = schema.safeParse({ kind, id });
  if (!parsed.success) redirect("/admin");

  const supabase = await createClient();
  const table = parsed.data.kind === "supplier" ? "suppliers" : "customers";
  const { data } = await supabase.from(table).select("profile_id, name").eq("id", parsed.data.id).maybeSingle();
  if (!data) redirect(parsed.data.kind === "supplier" ? "/admin/fornecedores" : "/admin/clientes");

  const store = await cookies();
  store.set(VIEW_AS_COOKIE, encodeViewAs({ kind: parsed.data.kind, profileId: data.profile_id, name: data.name }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h
  });
  redirect(VIEW_AS_HOME[parsed.data.kind]);
}

/** Encerra o "acessar como" e volta para o painel do admin. */
export async function stopViewAs(next?: string): Promise<never> {
  const store = await cookies();
  store.delete(VIEW_AS_COOKIE);
  redirect(typeof next === "string" && next.startsWith("/admin") ? next : "/admin");
}
