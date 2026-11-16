import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-sm sm:p-8 ring-1 ring-foreground/5">
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>{children}</Suspense>
        </div>
      </div>
    </main>
  );
}
