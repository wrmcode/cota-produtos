import { Skeleton } from "@/components/ui/skeleton";

export function ShellSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="hidden h-10 w-96 rounded-full md:block" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div className="mx-auto w-full max-w-screen-2xl space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
