import { Skeleton } from '@/components/ui/skeleton'

export function LessonLoadingSkeleton() {
    return (
        <div className="space-y-8">
            <Skeleton className="w-full h-64 rounded-xl" /> {/* Video placeholder */}

            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-40 rounded-lg" />
                <Skeleton className="h-40 rounded-lg" />
            </div>
        </div>
    )
}
