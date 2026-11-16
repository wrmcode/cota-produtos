import { ClipboardList, LayoutDashboard, Package, Store, Tags, Users, type LucideIcon } from "lucide-react";

/**
 * Ícones de navegação referenciados por nome. Server Components só podem
 * passar dados serializáveis para Client Components, então o `lib/navigation.ts`
 * usa estas chaves e os componentes client resolvem o ícone aqui.
 */
export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  store: Store,
  users: Users,
  package: Package,
  clipboard: ClipboardList,
  tags: Tags,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof NAV_ICONS;
