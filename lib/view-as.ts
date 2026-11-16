import type { UserRole } from "@/types/database";

/**
 * "Acessar como": o admin escolhe um fornecedor ou cliente e navega nas telas
 * daquele perfil. O alvo fica num cookie httpOnly; o proxy só o honra quando o
 * token da sessão é de admin, e só nas rotas /fornecedor e /cliente (a área
 * /admin continua sendo o próprio admin).
 */
export const VIEW_AS_COOKIE = "cota-view-as";

export type ViewAsKind = "supplier" | "customer";

export interface ViewAsTarget {
  kind: ViewAsKind;
  /** profiles.id do fornecedor/cliente alvo */
  profileId: string;
  /** nome exibido na faixa */
  name: string;
}

export const VIEW_AS_ROLE: Record<ViewAsKind, UserRole> = { supplier: "supplier", customer: "customer" };
export const VIEW_AS_HOME: Record<ViewAsKind, string> = { supplier: "/fornecedor", customer: "/cliente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeViewAs(t: ViewAsTarget): string {
  return Buffer.from(JSON.stringify(t), "utf8").toString("base64url");
}

export function decodeViewAs(raw: string | undefined | null): ViewAsTarget | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<ViewAsTarget>;
    if ((v.kind === "supplier" || v.kind === "customer") && typeof v.profileId === "string" && UUID.test(v.profileId)) {
      return { kind: v.kind, profileId: v.profileId, name: typeof v.name === "string" ? v.name.slice(0, 120) : "" };
    }
  } catch {
    /* cookie inválido → ignora */
  }
  return null;
}
