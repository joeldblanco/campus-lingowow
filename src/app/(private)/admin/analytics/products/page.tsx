import { Suspense } from 'react'
import { Metadata } from 'next'
import { getProductAnalytics } from '@/lib/actions/analytics'

export const metadata: Metadata = {
  title: 'Análisis de Productos | Analytics | Lingowow',
  description: 'Rendimiento de productos, distribución de planes y conversiones',
}
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ProductAnalyticsCharts } from '@/components/analytics/product-charts'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

async function ProductAnalyticsDashboard() {
  const data = await getProductAnalytics()

  return <ProductAnalyticsCharts data={data} />
}

export default function ProductAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin/analytics">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Analytics
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Análisis de Productos y Planes</h1>
        <p className="text-muted-foreground">
          Rendimiento de productos, distribución de planes y conversiones
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ProductAnalyticsDashboard />
      </Suspense>
    </div>
  )
}
