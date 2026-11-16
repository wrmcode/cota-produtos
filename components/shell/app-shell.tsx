import { Bell, Mail } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/supabase/proxy";
import { getNavForRole, ROLE_LABEL } from "@/lib/navigation";
import { IconRail } from "./icon-rail";
import { NavPills } from "./nav-pills";
import { UserMenu } from "./user-menu";
import { ViewAsBanner } from "./view-as-banner";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const role = user.profile.role;
  const nav = getNavForRole(role);
  const displayName = user.supplier?.name ?? user.customer?.name ?? user.profile.full_name ?? user.email;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {user.actor && <ViewAsBanner actor={user.actor} role={role} name={displayName} />}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href={ROLE_HOME[role]} />
          <NavPills items={nav} className="hidden md:flex" />
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon-lg" aria-label="Mensagens">
              <Mail />
            </Button>
            <Button variant="ghost" size="icon-lg" aria-label="Notificações">
              <Bell />
            </Button>
            <UserMenu name={displayName} email={user.email} roleLabel={ROLE_LABEL[role]} />
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <NavPills items={nav} className="w-full justify-between" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-screen-2xl flex-1 gap-4 px-4 pb-10 sm:px-6">
        <IconRail items={nav} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
