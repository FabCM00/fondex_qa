import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex h-svh flex-col">
      <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
        <Skeleton className="h-6 w-6 rounded-md" />
        <Skeleton className="h-4 w-px" />
        <Skeleton className="h-4 w-40" />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <p className="text-sm text-muted-foreground">Cargando recursos...</p>
      </div>
    </div>
  )
}
