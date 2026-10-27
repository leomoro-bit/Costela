import { cn } from "@/lib/utils";

/** Bloco cinza pulsante para indicar carregamento. Use em arquivos loading.tsx. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-superficie-2", className)} />;
}

/** Esqueleto genérico de página: título + cartões + lista. */
export function SkeletonPagina() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
