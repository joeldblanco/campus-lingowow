
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto p-4 md:p-8">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-40" />
                </div>
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-[140px] flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 h-[400px] p-6 space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-3 w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(2)].map((_, i) => (
                            <Skeleton key={i} className="h-[200px] rounded-xl" />
                        ))}
                    </div>
                </div>

                {/* Right Column (1/3 width) */}
                <div className="space-y-6">
                    <Skeleton className="h-[300px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl" />
                </div>
            </div>
        </div>
    )
}
