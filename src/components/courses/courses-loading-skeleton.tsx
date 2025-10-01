import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function CoursesLoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Filters Skeleton */}
      <div className="flex flex-wrap gap-4 items-center">
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>

      {/* Course Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <div className="w-full flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
