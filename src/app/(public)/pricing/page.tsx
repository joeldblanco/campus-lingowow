'use client'

import React, { useEffect, useState } from 'react'
import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { CartDrawer } from '@/components/shop/cart/cart-drawer'
import { Button } from '@/components/ui/button'
import { CheckCircle, ChevronDown, GraduationCap, Globe, Rocket, Languages, Loader2, Check } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
import { getPlans, getPricingPlansForProduct, getProducts } from '@/lib/actions/commercial'
import { useShopStore } from '@/stores/useShopStore'
import { toast } from 'sonner'
import type { Plan, Feature, PlanPricing } from '@prisma/client'

// Extended type to include relations matching the getPlans return type
type PlanWithFeatures = Plan & {
  features: {
    included: boolean
    feature: Feature
  }[]
  pricing?: PlanPricing[]
}

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

  const isInCart = (planId: string) => {
    return cart.some((item) => item.plan.id === planId)
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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-12 md:py-20 px-4 overflow-hidden">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-6 font-lexend">
              Invierte en tu fluidez
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
              Elige el plan que se adapte a tus objetivos. Mejora, cambia o cancela en cualquier momento.
            </p>

            {/* Language Tabs - only show if plans have language-specific pricing */}
            {hasLanguagePricing && (
              <div className="flex flex-col items-center gap-4 mb-8">
                <span className="text-sm text-slate-500 dark:text-slate-400">Selecciona el idioma que deseas aprender:</span>
                <Tabs value={selectedLanguage} onValueChange={setSelectedLanguage} className="w-auto">
                  <TabsList className="grid grid-cols-2 w-[300px]">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <TabsTrigger 
                        key={lang.code} 
                        value={lang.code}
                        className="gap-2 text-base"
                      >
                        <span className="text-lg">{lang.flag}</span>
                        {lang.code === 'en' ? 'Inglés' : 'Español'}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
            <span className="font-bold text-slate-900 dark:text-white bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full">
              Planes Mensuales Flexibles
            </span>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-4 pb-20">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-${Math.min(filteredPlans.length, 3)} gap-8 items-start justify-center`}>
                {filteredPlans.length === 0 && (
                  <div className="col-span-full text-center text-slate-500">
                    No hay planes disponibles en este momento.
                  </div>
                )}
                {filteredPlans.map((plan) => {
                  const isPopular = plan.isPopular

                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "relative flex flex-col p-6 bg-white dark:bg-[#1a2632] rounded-xl transition-all duration-300",
                        isPopular
                          ? "border-2 border-primary shadow-xl scale-105 z-10"
                          : "border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50"
                      )}
                    >
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-md">
                          Más Popular
                        </div>
                      )}

                      <div className="mb-5 mt-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-lexend">{plan.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                          {plan.description || "Plan de aprendizaje completo"}
                        </p>
                        {(() => {
                          const { price, comparePrice } = getPriceForLanguage(plan, selectedLanguage)
                          return (
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-bold text-slate-900 dark:text-white font-lexend">
                                ${Number(price).toFixed(0)}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 font-medium">/mes</span>
                              {comparePrice && comparePrice > price && (
                                <span className="text-lg text-slate-400 line-through">
                                  ${Number(comparePrice).toFixed(0)}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      <Button
                        variant={isInCart(plan.id) ? "secondary" : isPopular ? "default" : "outline"}
                        className={cn(
                          "w-full py-3 h-auto mb-8 font-bold",
                          isInCart(plan.id)
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : isPopular
                              ? "bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                              : "bg-slate-100 border-none hover:bg-slate-200 text-slate-900"
                        )}
                        onClick={() => handleAddToCart(plan)}
                      >
                        {isInCart(plan.id) ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Añadido al Carrito
                          </>
                        ) : isPopular ? "Obtener Plan" : "Empezar Ahora"}
                      </Button>

                      <div className="space-y-4">
                        {plan.features?.filter(f => f.included).map((pf, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <CheckCircle className="text-primary h-5 w-5 shrink-0" />
                            <span>{pf.feature.name}</span>
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

        {/* Trust Indicator */}
        <section className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632]">
          <div className="max-w-7xl mx-auto py-12 px-4 text-center">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-8">Confían en nosotros estudiantes de</p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2 font-bold text-xl text-slate-700 dark:text-slate-300">
                <GraduationCap className="h-6 w-6" /> University of Tech
              </div>
              <div className="flex items-center gap-2 font-bold text-xl text-slate-700 dark:text-slate-300">
                <Globe className="h-6 w-6" /> Global Corp
              </div>
              <div className="flex items-center gap-2 font-bold text-xl text-slate-700 dark:text-slate-300">
                <Rocket className="h-6 w-6" /> Startup Inc
              </div>
              <div className="flex items-center gap-2 font-bold text-xl text-slate-700 dark:text-slate-300">
                <Languages className="h-6 w-6" /> LinguaPress
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        {uniqueFeatures.length > 0 && !loading && (
          <section className="py-20 px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 font-lexend">Compara las Características</h2>
                <p className="text-slate-600 dark:text-slate-400">Desglose detallado de lo que incluye cada plan.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="py-4 px-6 text-sm font-semibold text-slate-500 dark:text-slate-400 w-1/4">Características</th>
                      {filteredPlans.map(plan => (
                        <th key={plan.id} className={cn("py-4 px-6 text-lg font-bold w-1/4 text-center font-lexend", plan.isPopular ? "text-primary" : "text-slate-900 dark:text-white")}>
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {uniqueFeatures.map((featureName, idx) => (
                      <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-900 dark:text-white">{featureName}</td>
                        {filteredPlans.map(plan => {
                          const pf = plan.features?.find((f) => f.feature.name === featureName)
                          const included = pf?.included
                          return (
                            <td key={plan.id} className="py-4 px-6 text-center">
                              <div className="flex justify-center">
                                {included ? (
                                  <CheckCircle className="text-primary h-5 w-5" />
                                ) : (
                                  <span className="text-slate-300 font-bold">—</span>
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
        <section className="py-20 px-4 bg-white dark:bg-[#1a2632] border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 font-lexend">Preguntas Frecuentes</h2>
            </div>
            <div className="space-y-4">
              <details className="group bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 open:border-primary/50 transition-all">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-slate-900 dark:text-white hover:text-primary transition-colors list-none">
                  <span>¿Puedo cambiar de plan más tarde?</span>
                  <ChevronDown className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  ¡Absolutamente! Puedes mejorar o reducir tu plan en cualquier momento desde la configuración de tu cuenta.
                </div>
              </details>
              <details className="group bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 open:border-primary/50 transition-all">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-slate-900 dark:text-white hover:text-primary transition-colors list-none">
                  <span>¿Hay política de reembolso?</span>
                  <ChevronDown className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sí, ofrecemos una garantía de devolución de dinero de 14 días para todos los planes pagos.
                </div>
              </details>
              <details className="group bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 open:border-primary/50 transition-all">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-slate-900 dark:text-white hover:text-primary transition-colors list-none">
                  <span>¿El acceso es ilimitado?</span>
                  <ChevronDown className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sí, dependiendo de tu plan, tendrás acceso ilimitado a las lecciones y ejercicios disponibles.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 px-4 bg-primary text-white text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 font-lexend">¿Aún tienes dudas?</h2>
            <p className="text-lg opacity-90 mb-8">Ponte en contacto con nuestro equipo de soporte para obtener más información.</p>
            <Button variant="secondary" className="bg-white text-primary hover:bg-slate-100 font-bold py-3 px-8 rounded-lg shadow-lg transition-transform hover:-translate-y-1">
              Contactar Soporte
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
