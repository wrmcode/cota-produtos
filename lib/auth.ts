import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { TAGS, userTag } from "@/lib/cache-tags";
import { createCacheClient } from "@/lib/supabase/cache-client";
import { createClient } from "@/lib/supabase/server";
import { AUTH_HEADERS } from "@/lib/supabase/proxy";
import type { Customer, Profile, Supplier, UserRole } from "@/types/database";

/** Admin real por trás de um "acessar como". */
export interface Actor {
  id: string;
  email: string;
  role: UserRole;
  /** nome do fornecedor/cliente que está sendo visualizado */
  viewingName: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile;
  supplier: Supplier | null;
  customer: Customer | null;
  /** presente quando um admin está navegando como fornecedor/cliente */
  actor: Actor | null;
}

export interface SessionIdentity {
  id: string;
  email: string;
  role: UserRole | null;
  actor: Actor | null;
}

type ProfileWithLinks = Profile & { suppliers: Supplier | null; customers: Customer | null };

/**
 * Identidade já validada pelo proxy (headers internos) — sem ida ao banco.
 * Use para disparar consultas em paralelo com `requireRole()`.
 * Fora do fluxo do proxy, cai para `getUser()`.
 */
export const getSessionIdentity = cache(async (): Promise<SessionIdentity> => {
  await connection();
  const h = await headers();
  const id = h.get(AUTH_HEADERS.userId);
  if (id) {
    const role = h.get(AUTH_HEADERS.role);
    const actorId = h.get(AUTH_HEADERS.actorId);
    const actor: Actor | null = actorId
      ? {
          id: actorId,
          email: h.get(AUTH_HEADERS.actorEmail) ?? "",
          role: (h.get(AUTH_HEADERS.actorRole) as UserRole | null) ?? "admin",
          viewingName: decodeURIComponent(h.get(AUTH_HEADERS.viewAsName) ?? ""),
        }
      : null;
    return { id, email: h.get(AUTH_HEADERS.email) ?? "", role: (role as UserRole | null) ?? null, actor };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { id: user.id, email: user.email ?? "", role: null, actor: null };
});

/** Perfil + cadastro, em cache por usuário (tag `user:<id>` e `users`). */
async function getProfileWithLinks(userId: string): Promise<ProfileWithLinks | null> {
  "use cache";
  cacheTag(TAGS.users, TAGS.suppliers, TAGS.customers, userTag(userId));
  cacheLife("hours");

  const { data } = await createCacheClient()
    .from("profiles")
    .select("*, suppliers(*), customers(*)")
    .eq("id", userId)
    .maybeSingle();
  return (data as unknown as ProfileWithLinks | null) ?? null;
}

/**
 * Usuário logado + perfil + cadastro (fornecedor/cliente). Cacheado por request
 * (React cache) e entre requests (`"use cache"`, por id). O id vem do header
 * assinado pelo proxy, por isso é seguro usá-lo com o cache client.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const { id: userId, email, actor } = await getSessionIdentity();
  const data = await getProfileWithLinks(userId);
  if (!data) {
    // Alvo do "acessar como" não existe mais → volta para o admin
    if (actor) redirect("/admin?view-as=invalido");
    redirect("/login");
  }

  const { suppliers, customers, ...profile } = data;
  return {
    id: userId,
    email: email || profile.email || "",
    profile,
    supplier: suppliers ?? null,
    customer: customers ?? null,
    actor,
  };
});

/** Garante que o usuário tem o papel esperado (defesa extra além do proxy). */
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user.profile.role !== role) redirect("/");
  return user;
}
