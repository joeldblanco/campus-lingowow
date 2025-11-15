import { Card, CardContent, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Check, X } from 'lucide-react'

// Sample features for coming soon plans
const sampleFeatures = [
  "2-3 clases por semana",
  "Instructores nativos certificados", 
  "Práctica de conversación en vivo",
  "Material de estudio exclusivo",
  "Seguimiento de progreso personalizado",
  "Certificado final",
  "Acceso a sesiones grabadas",
  "Actividades comunitarias",
  "Horarios flexibles",
  "Tutoría 1-on-1"
]

export function ComingSoonProduct() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg hover:shadow-xl transition-shadow p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-6 min-h-[400px]">
        {/* Product Card - Left Side */}
        <div className="lg:w-1/3">
          <Card className="border-2 bg-gradient-to-br from-blue-50 to-white h-full relative">
            {/* Title Overlay */}
            <div className="absolute top-4 left-4 z-10 pr-20">
              <div className="space-y-2">
                <Skeleton className="h-16 w-48 bg-blue-200/50" />
                <Skeleton className="h-8 w-32 bg-blue-200/50" />
              </div>
            </div>
            <CardContent className="pt-0">
              <div className="h-full mt-8 relative">
                <Skeleton className="h-full w-full rounded-md" />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-blue-50/95 to-transparent rounded-md pointer-events-none" />
              </div>
              <CardDescription className="line-clamp-3 text-sm text-gray-600">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Plans Section - Right Side */}
        <div className="lg:w-2/3 flex flex-col h-full">
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch flex-1 min-h-[400px]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 flex flex-col h-full transition-all duration-200 bg-white border-gray-200">
                {/* Plan Title */}
                <div className="text-center mb-4">
                  <Skeleton className="h-6 w-24 mx-auto mb-2" />
                  <div className="flex items-baseline justify-center gap-1">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-2 mb-4">
                  {sampleFeatures.slice(0, 6).map((feature, idx) => {
                    // Alternate between included and not included for variety
                    const included = idx < 4 || (i === 2 && idx === 4)
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        {included ? (
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-xs break-words ${
                            !included && 'text-muted-foreground line-through'
                          }`}
                        >
                          {feature}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Button */}
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
