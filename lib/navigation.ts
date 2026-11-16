import type { NavItem } from "@/components/shell/nav-pills";
import type { UserRole } from "@/types/database";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  supplier: "Fornecedor",
  customer: "Cliente",
};

/** Itens de navegação por papel. `icon` é uma chave de NAV_ICONS (serializável). */
export function getNavForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return [
        { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
        { href: "/admin/fornecedores", label: "Fornecedores", icon: "store" },
        { href: "/admin/clientes", label: "Clientes", icon: "users" },
        { href: "/admin/produtos", label: "Produtos", icon: "package" },
        { href: "/admin/categorias", label: "Categorias", icon: "tags" },
      ];
    case "supplier":
      return [
        { href: "/fornecedor", label: "Cotação do dia", icon: "clipboard", exact: true },
        { href: "/fornecedor/produtos", label: "Meus produtos", icon: "package" },
      ];
    case "customer":
      return [
        { href: "/cliente", label: "Ranking", icon: "dashboard", exact: true },
        { href: "/cliente/fornecedores", label: "Fornecedores", icon: "store" },
      ];
  }
}
