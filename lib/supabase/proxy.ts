import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decodeViewAs, VIEW_AS_COOKIE, VIEW_AS_HOME, VIEW_AS_ROLE } from "@/lib/view-as";
import type { Database, UserRole } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/auth", "/definir-senha"];

export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  supplier: "/fornecedor",
  customer: "/cliente",
};

const ROLES: UserRole[] = ["admin", "supplier", "customer"];

/**
 * Headers internos preenchidos pelo proxy depois de validar a sessão.
 * Server Components leem via `getCurrentUser()` e evitam repetir a validação.
 * São sempre sobrescritos aqui, então um cliente não consegue forjá-los.
 *
 * Em modo "acessar como" (admin vendo um fornecedor/cliente), `userId`/`email`/`role`
 * passam a ser os do ALVO e `actorId`/`actorRole` identificam o admin real.
 */
export const AUTH_HEADERS = {
  userId: "x-cota-user-id",
  email: "x-cota-user-email",
  role: "x-cota-user-role",
  actorId: "x-cota-actor-id",
  actorEmail: "x-cota-actor-email",
  actorRole: "x-cota-actor-role",
  viewAsName: "x-cota-view-as-name",
} as const;

function isRole(v: unknown): v is UserRole {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

export async function updateSession(request: NextRequest) {
  // Nunca confiar nesses headers vindos de fora
  const requestHeaders = new Headers(request.headers);
  for (const h of Object.values(AUTH_HEADERS)) requestHeaders.delete(h);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims() verifica a assinatura do JWT (ES256) localmente com as chaves públicas
  // do projeto (JWKS em cache no processo) — ~0 ms, sem ida ao Supabase. Só vai à rede
  // para renovar um token expirado. Nunca usar getSession() para autorização.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims ?? null;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!claims?.sub) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const user = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };

  // Papel: vem no token (app_metadata, definido no cadastro) — sem ida ao banco.
  // Fallback para a tabela profiles em usuários antigos.
  const appMeta = (claims.app_metadata ?? {}) as Record<string, unknown>;
  let role: UserRole | null = isRole(appMeta.role) ? appMeta.role : null;
  if (!role) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    role = profile?.role ?? "customer";
  }

  // "Acessar como": só para admin, e só fora da área /admin
  const viewAs = role === "admin" && !pathname.startsWith("/admin") ? decodeViewAs(request.cookies.get(VIEW_AS_COOKIE)?.value) : null;
  const effectiveRole: UserRole = viewAs ? VIEW_AS_ROLE[viewAs.kind] : role;
  const home = viewAs ? VIEW_AS_HOME[viewAs.kind] : ROLE_HOME[role];

  // Logado tentando acessar login ou raiz → manda pra home do papel
  if (pathname === "/" || pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Admin sem "acessar como" numa área de fornecedor/cliente → vai escolher quem ver
  if (role === "admin" && !viewAs) {
    const pick = pathname.startsWith("/fornecedor") ? "/admin/fornecedores" : pathname.startsWith("/cliente") ? "/admin/clientes" : null;
    if (pick) {
      const url = request.nextUrl.clone();
      url.pathname = pick;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Bloqueia acesso a área de outro papel (admin pode entrar em qualquer área)
  if (role !== "admin") {
    const forbidden = (Object.entries(ROLE_HOME) as [UserRole, string][]).some(
      ([r, prefix]) => r !== role && pathname.startsWith(prefix),
    );
    if (forbidden) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (viewAs) {
    requestHeaders.set(AUTH_HEADERS.userId, viewAs.profileId);
    requestHeaders.set(AUTH_HEADERS.email, "");
    requestHeaders.set(AUTH_HEADERS.role, effectiveRole);
    requestHeaders.set(AUTH_HEADERS.actorId, user.id);
    requestHeaders.set(AUTH_HEADERS.actorEmail, user.email);
    requestHeaders.set(AUTH_HEADERS.actorRole, role);
    requestHeaders.set(AUTH_HEADERS.viewAsName, encodeURIComponent(viewAs.name));
  } else {
    requestHeaders.set(AUTH_HEADERS.userId, user.id);
    requestHeaders.set(AUTH_HEADERS.email, user.email);
    requestHeaders.set(AUTH_HEADERS.role, role);
  }
  const forwarded = NextResponse.next({ request: { headers: requestHeaders } });
  // Preserva cookies renovados pelo setAll
  response.cookies.getAll().forEach((c) => forwarded.cookies.set(c));
  return forwarded;
}
