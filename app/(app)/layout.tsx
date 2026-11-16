import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { getCurrentUser } from "@/lib/auth";

// Toda a área logada depende dos cookies de sessão e do banco, então ela é
// renderizada dinamicamente dentro de um Suspense (exigência do Cache Components
// do Next 16) e as navegações entre páginas podem aguardar os dados.
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <AppShell user={user}>{children}</AppShell>;
}
