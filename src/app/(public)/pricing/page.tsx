'use client'

import React, { useEffect, useState } from 'react'
import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { CartDrawer } from '@/components/shop/cart/cart-drawer'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Check, CheckCircle, Loader2, Star } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
import { getPlans, getPricingPlansForProduct, getProducts } from '@/lib/actions/commercial'
import { useShopStore } from '@/stores/useShopStore'
import { toast } from 'sonner'
import type { PlanWithFeatures } from '@/types/shop'

const GOOGLE_REVIEWS_URL =
  'https://www.google.com/maps/place/Lingowow/@-12.0015217,-77.1199284,17z/data=!4m8!3m7!1s0x9105cd90a8800b7d:0xceb4d33979f426ad!8m2!3d-12.0015217!4d-77.1173535!9m1!1b1!16s%2Fg%2F11j2wlfzw8'

const FAQS = [
  {
    q: '¿Puedo cambiar de plan más tarde?',
    a: '¡Absolutamente! Puedes mejorar o reducir tu plan en cualquier momento desde la configuración de tu cuenta.',
  },
  {
    q: '¿Hay política de reembolso?',
    a: 'Sí, ofrecemos una garantía de devolución de dinero de 14 días para todos los planes pagos.',
  },
  {
    q: '¿El acceso es ilimitado?',
    a: 'Sí, dependiendo de tu plan, tendrás acceso ilimitado a las lecciones y ejercicios disponibles.',
  },
]

export default function PricingPage() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')
  const [plans, setPlans] = useState<PlanWithFeatures[]>([])
  const [product, setProduct] = useState<{ id: string; name: string; description: string | null; image: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uniqueFeatures, setUniqueFeatures] = useState<string[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')

  // Shop store
  const { addToCart, cart, isCartDrawerOpen, setCartDrawerOpen, lastAddedItem } = useShopStore()

  // Mostrar toast cuando se añade un producto
  useEffect(() => {
    if (lastAddedItem) {
      toast.success('¡Añadido correctamente!', {
        description: `"${lastAddedItem.plan.name}" ha sido añadido a tu carrito.`,
        duration: 4000,
        position: 'bottom-left',
      })
    }
  }, [lastAddedItem])

  const isInCart = (planId: string, language: string) => {
    return cart.some((item) => item.plan.id === planId && item.language === language)
  }

  const getPriceForLanguage = (plan: PlanWithFeatures, language: string) => {
    const pricing = plan.pricing?.find(p => p.language === language && p.isActive)
    if (pricing) {
      return { price: pricing.price, comparePrice: pricing.comparePrice }
    }
    // Fallback to base price
    return { price: plan.price, comparePrice: plan.comparePrice }
  }

  // Check if any plan has language-specific pricing configured
  const hasLanguagePricing = plans.some(plan =>
    plan.pricing && plan.pricing.length > 0 && plan.pricing.some(p => p.isActive)
  )

  // Filter plans based on selected language - only show plans that have pricing for that language
  const filteredPlans = hasLanguagePricing
    ? plans.filter(plan =>
        plan.pricing?.some(p => p.language === selectedLanguage && p.isActive)
      )
    : plans

  const handleAddToCart = (plan: PlanWithFeatures) => {
    const { price } = getPriceForLanguage(plan, selectedLanguage)
    addToCart({
      product: {
        id: product?.id || productId || 'unknown',
        title: product?.name || 'Plan de Aprendizaje',
        description: product?.description || plan.description,
        image: product?.image || null,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        price: Number(price),
      },
      quantity: 1,
      language: selectedLanguage,
    })
  }

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)
        let fetchedPlans: PlanWithFeatures[] = []

        if (productId) {
          fetchedPlans = await getPricingPlansForProduct(productId)
          // Fetch product info
          const products = await getProducts({ isActive: true })
          const foundProduct = products.find(p => p.id === productId)
          if (foundProduct) {
            setProduct({
              id: foundProduct.id,
              name: foundProduct.name,
              description: foundProduct.description,
              image: foundProduct.image,
            })
          }
        } else {
          fetchedPlans = await getPlans()
        }

        setPlans(fetchedPlans)

        // Extract unique feature names for the table
        const featureSet = new Set<string>()
        fetchedPlans.forEach((plan) => {
          if (plan.features) {
            plan.features.forEach((pf) => {
              if (pf.feature?.name) featureSet.add(pf.feature.name)
            })
          }
        })
        setUniqueFeatures(Array.from(featureSet).sort())

      } catch (error) {
        console.error("Failed to fetch plans", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [productId])

  // Tailwind can't see runtime-built class names — map plan count to literal classes.
  const gridColsClass =
    filteredPlans.length >= 3
      ? 'sm:grid-cols-2 lg:grid-cols-3'
      : filteredPlans.length === 2
        ? 'sm:grid-cols-2 max-w-3xl mx-auto'
        : 'max-w-md mx-auto'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="container mx-auto max-w-3xl px-4 py-16 text-center md:px-6 md:py-24">
            <h1 className="font-lexend text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Invierte en tu fluidez
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Elige el plan que se adapte a tus objetivos. Mejora, cambia o cancela en cualquier momento.
            </p>

            {/* Language Tabs - only show if plans have language-specific pricing */}
            {hasLanguagePricing && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Selecciona el idioma que deseas aprender:
                </span>
                <Tabs value={selectedLanguage} onValueChange={setSelectedLanguage} className="w-auto">
                  <TabsList className="grid w-[300px] grid-cols-2">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <TabsTrigger key={lang.code} value={lang.code} className="gap-2 text-base">
                        <span className="text-lg">{lang.flag}</span>
                        {lang.code === 'en' ? 'Inglés' : 'Español'}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
            <span className="mt-6 inline-flex rounded-full bg-teal-soft px-4 py-2 text-sm font-medium text-teal-ink">
              Planes mensuales flexibles
            </span>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-4 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className={cn('grid grid-cols-1 items-stretch gap-6', gridColsClass)}>
                {filteredPlans.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground">
                    No hay planes disponibles en este momento.
                  </div>
                )}
                {filteredPlans.map((plan) => {
                  const isPopular = plan.isPopular
                  const inCart = isInCart(plan.id, selectedLanguage)

                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        'relative flex flex-col rounded-2xl bg-card p-6 transition-transform duration-200 hover:-translate-y-1',
                        isPopular
                          ? 'border-2 border-primary shadow-md'
                          : 'border border-border shadow-sm hover:border-primary/40',
                      )}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
                          Más popular
                        </div>
                      )}

                      <div className="mb-5 mt-2">
                        <h3 className="font-lexend text-lg font-bold">{plan.name}</h3>
                        <p className="mb-4 mt-1 text-sm text-muted-foreground">
                          {plan.description || 'Plan de aprendizaje completo'}
                        </p>
                        {(() => {
                          const { price, comparePrice } = getPriceForLanguage(plan, selectedLanguage)
                          return (
                            <div className="flex items-baseline gap-2">
                              <span className="font-lexend text-4xl font-bold tabular-nums">
                                ${Number(price).toFixed(0)}
                              </span>
                              <span className="font-medium text-muted-foreground">/mes</span>
                              {comparePrice && comparePrice > price && (
                                <span className="text-lg text-muted-foreground line-through tabular-nums">
                                  ${Number(comparePrice).toFixed(0)}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      <Button
                        variant={inCart ? 'secondary' : isPopular ? 'default' : 'outline'}
                        className="mb-8 h-auto w-full rounded-full py-3 font-semibold"
                        onClick={() => handleAddToCart(plan)}
                      >
                        {inCart ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Añadido al carrito
                          </>
                        ) : isPopular ? (
                          'Obtener plan'
                        ) : (
                          'Empezar ahora'
                        )}
                      </Button>

                      <div className="space-y-4">
                        {plan.features?.filter((f) => f.included).map((pf, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 text-sm text-foreground"
                          >
                            <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                            <span>
                              {pf.feature.name}
                              {pf.value != null && (
                                <span className="text-muted-foreground">: {pf.value}</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Trust line — real, verifiable proof (no invented logos) */}
        <section className="border-y border-border bg-secondary/50">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-10 text-center sm:flex-row sm:justify-center sm:gap-8">
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">4,9</span>
              <span>· 38 reseñas verificadas en Google</span>
            </a>
            <span className="hidden h-4 w-px bg-border sm:inline-block" />
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
              Garantía de devolución de 14 días
            </span>
          </div>
        </section>

        {/* Comparison Table */}
        {filteredPlans.length > 0 && !loading && (
          <section className="px-4 py-20">
            <div className="mx-auto max-w-5xl">
              <div className="mb-12 text-center">
                <h2 className="font-lexend text-3xl font-bold tracking-tight">
                  Compara las características
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Desglose detallado de lo que incluye cada plan.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-1/4 px-6 py-4 text-sm font-semibold text-muted-foreground">
                        Características
                      </th>
                      {filteredPlans.map((plan) => (
                        <th
                          key={plan.id}
                          className={cn(
                            'w-1/4 px-6 py-4 text-center font-lexend text-lg font-bold',
                            plan.isPopular ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {uniqueFeatures.map((featureName, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-border transition-colors hover:bg-muted/50"
                      >
                        <td className="px-6 py-4 font-medium text-foreground">{featureName}</td>
                        {filteredPlans.map((plan) => {
                          const pf = plan.features?.find((f) => f.feature.name === featureName)
                          const included = pf?.included
                          const value = pf?.value
                          return (
                            <td key={plan.id} className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center">
                                {included ? (
                                  value != null ? (
                                    <span className="text-xs font-medium text-foreground">{value}</span>
                                  ) : (
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                  )
                                ) : (
                                  <span className="font-bold text-muted-foreground/50">—</span>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="border-t border-border bg-secondary/50 px-4 py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="font-lexend text-3xl font-bold tracking-tight">Preguntas frecuentes</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-lexend text-base font-medium">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-primary px-4 py-16 text-center text-primary-foreground">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-lexend text-3xl font-bold">¿Aún tienes dudas?</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-primary-foreground/90">
              Ponte en contacto con nuestro equipo de soporte para obtener más información.
            </p>
            <Button
              variant="secondary"
              className="mt-8 rounded-full bg-background px-8 py-3 font-semibold text-primary hover:bg-background/90"
              asChild
            >
              <a href="/contact">Contactar soporte</a>
            </Button>
          </div>
        </section>
      </main>

      <CartDrawer
        open={isCartDrawerOpen}
        onOpenChange={setCartDrawerOpen}
        suggestedProducts={[]}
      />
      <Footer />
    </div>
  )
}
