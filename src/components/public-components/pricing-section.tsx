'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getPublicPlans } from '@/lib/actions/subscriptions'

type PlanWithFeatures = Awaited<ReturnType<typeof getPublicPlans>>[0]

export function PricingSection() {
  const [plans, setPlans] = useState<PlanWithFeatures[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await getPublicPlans()
        setPlans(data)
      } catch (error) {
        console.error('Error loading plans:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPlans()
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const getBillingPeriod = (billingCycle: string | null) => {
    switch (billingCycle) {
      case 'WEEKLY':
        return '/semana'
      case 'MONTHLY':
        return '/mes'
      case 'QUARTERLY':
        return '/trimestre'
      case 'ANNUAL':
        return '/año'
      default:
        return '/mes'
    }
  }

  if (loading) {
    return (
      <section id="precios" className="w-full py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Planes y Precios</h2>
            <p className="text-muted-foreground max-w-[700px]">
              Flexibilidad para adaptarse a tus necesidades y presupuesto.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (plans.length === 0) {
    return (
      <section id="precios" className="w-full py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Planes y Precios</h2>
            <p className="text-muted-foreground max-w-[700px]">
              Próximamente tendremos planes disponibles para ti.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="precios" className="w-full py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Planes y Precios</h2>
          <p className="text-muted-foreground max-w-[700px]">
            Flexibilidad para adaptarse a tus necesidades y presupuesto.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={plan.isPopular ? 'border-primary relative' : ''}
            >
              {plan.isPopular && (
                <Badge className="absolute right-4 top-4">Popular</Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                {plan.description && (
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                )}
                <div className="mt-4">
                  <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
                  <span className="text-muted-foreground ml-1">
                    {getBillingPeriod(plan.billingCycle)}
                  </span>
                </div>
                {plan.comparePrice && plan.comparePrice > plan.price && (
                  <div className="text-sm text-muted-foreground line-through">
                    {formatPrice(plan.comparePrice)}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.includesClasses && plan.classesPerWeek && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.classesPerWeek} {plan.classesPerWeek === 1 ? 'clase' : 'clases'} por
                        semana
                      </span>
                    </li>
                  )}
                  {plan.includesClasses && plan.classesPerPeriod && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.classesPerPeriod} {plan.classesPerPeriod === 1 ? 'clase' : 'clases'}{' '}
                        por período
                      </span>
                    </li>
                  )}
                  {plan.course && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Acceso a {plan.course.title}</span>
                    </li>
                  )}
                  {plan.features.map((pf) => (
                    <li key={pf.featureId} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        {pf.feature.name}
                        {pf.value && `: ${pf.value}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/shop" className="w-full">
                  <Button className="w-full" variant={plan.isPopular ? 'default' : 'outline'}>
                    Seleccionar Plan
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
