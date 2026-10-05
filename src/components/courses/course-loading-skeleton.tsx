import { Skeleton } from '@/components/ui/skeleton'

export function CourseLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" role="status" aria-label="Cargando curso">
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="space-y-3">
          <Skeleton className="h-9 w-64 max-w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <div className="w-full space-y-3 sm:w-64">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-56" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-6 w-48" />
      <div className="overflow-hidden rounded-xl border">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="ml-auto h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
