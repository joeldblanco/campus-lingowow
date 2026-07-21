'use client'

import React, { useEffect, useState } from 'react'
import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { CheckCircle, ChevronDown, Loader2, ShieldCheck } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { getPricingPlansForProduct, getProducts } from '@/lib/actions/commercial'
import { useShopStore } from '@/stores/useShopStore'
import type { PlanWithFeatures } from '@/types/shop'
import {
  GoogleRatingBadge,
  InstructorCredentials,
  StudentTestimonials,
} from '@/components/public-components/social-proof'
import {
  billingPeriodSuffix,
  billingViewLabel,
  DEFAULT_BILLING_VIEW,
  filterByBillingView,
  getRecommendedPlanId,
  hasBillingToggle,
  pricingRedirectPath,
  type BillingView,
} from '@/lib/pricing-helpers'

export default function PricingPage() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')
  const [plans, setPlans] = useState<PlanWithFeatures[]>([])
  const [product, setProduct] = useState<{ id: string; name: string; description: string | null; image: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uniqueFeatures, setUniqueFeatures] = useState<string[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  const [billingView, setBillingView] = useState<BillingView>(DEFAULT_BILLING_VIEW)
  
  // Shop store
  const router = useRouter()
  const { buyNow } = useShopStore()

  useEffect(() => {
    const redirectPath = pricingRedirectPath(productId)
    if (redirectPath) router.replace(redirectPath)
  }, [productId, router])

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

  // Monthly/annual toggle — only rendered when the catalogue genuinely has both
  // an annual and a non-annual plan. We never synthesize an annual price.
  const showBillingToggle = hasBillingToggle(filteredPlans)
  const visiblePlans = showBillingToggle
    ? filterByBillingView(filteredPlans, billingView)
    : filteredPlans

  // Exactly one tier reads as recommended (anchor-hero-decoy).
  const recommendedPlanId = getRecommendedPlanId(visiblePlans)

  const handleBuyNow = (plan: PlanWithFeatures) => {
    const { price } = getPriceForLanguage(plan, selectedLanguage)
    buyNow({
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
    router.push('/shop/cart/checkout')
  }

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)
        let fetchedPlans: PlanWithFeatures[] = []

        if (!productId) {
          setLoading(false)
          return
        }

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
            <div className="flex flex-col items-center gap-4">
              <span className="font-bold text-slate-900 dark:text-white bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full">
                Planes flexibles, cancela cuando quieras
              </span>
              <GoogleRatingBadge />
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-4 pb-20">
          <div className="max-w-7xl mx-auto">
            {/* Monthly / annual toggle — shown only when real annual plans exist */}
            {!loading && showBillingToggle && (
              <div className="flex justify-center mb-10">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
                  <span className={cn('px-2 text-sm font-semibold', billingView === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500')}>
                    Mensual
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={billingView === 'annual'}
                    aria-label="Cambiar entre facturación mensual y anual"
                    onClick={() => setBillingView(billingView === 'annual' ? 'monthly' : 'annual')}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      billingView === 'annual' ? 'bg-primary' : 'bg-slate-300'
                    )}
                  >
                    <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-transform', billingView === 'annual' ? 'translate-x-6' : 'translate-x-1')} />
                  </button>
                  <span className={cn('px-2 text-sm font-semibold', billingView === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-500')}>
                    {billingViewLabel('annual')}
                  </span>
                </div>
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-${Math.min(visiblePlans.length, 3)} gap-8 items-start justify-center`}>
                {visiblePlans.length === 0 && (
                  <div className="col-span-full text-center text-slate-500">
                    No hay planes disponibles en este momento.
                  </div>
                )}
                {visiblePlans.map((plan) => {
                  const isPopular = plan.id === recommendedPlanId

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
                              <span className="text-slate-500 dark:text-slate-400 font-medium">
                                {billingPeriodSuffix(plan.billingCycle)}
                              </span>
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
                        variant={isPopular ? "default" : "outline"}
                        className={cn(
                          "w-full py-3 h-auto mb-3 font-bold",
                          isPopular
                            ? "bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                            : "bg-slate-100 border-none hover:bg-slate-200 text-slate-900"
                        )}
                        onClick={() => handleBuyNow(plan)}
                      >
                        {isPopular ? "Obtener plan" : "Empezar ahora"}
                      </Button>

                      {/* Risk-reduction right at the decision point */}
                      <p className="mb-7 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        Garantía de 30 días · Cancela cuando quieras
                      </p>

                      <div className="space-y-4">
                        {plan.features?.filter(f => f.included).map((pf, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <CheckCircle className="text-primary h-5 w-5 shrink-0" />
                            <span>
                              {pf.feature.name}
                              {pf.value != null && <span className="text-slate-500 dark:text-slate-400">: {pf.value}</span>}
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

        {/* Trust block: instructor credibility + real Google reviews near the plans */}
        <section className="px-4 pb-4">
          <div className="max-w-5xl mx-auto">
            <InstructorCredentials />
          </div>
        </section>
        <StudentTestimonials
          className="bg-slate-50 dark:bg-slate-900/40"
          heading="Estudiantes reales, resultados reales"
          limit={3}
        />

        {/* Comparison Table */}
        {visiblePlans.length > 0 && !loading && (
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
                      {visiblePlans.map(plan => (
                        <th key={plan.id} className={cn("py-4 px-6 text-lg font-bold w-1/4 text-center font-lexend", plan.id === recommendedPlanId ? "text-primary" : "text-slate-900 dark:text-white")}>
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {uniqueFeatures.map((featureName, idx) => (
                      <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-900 dark:text-white">{featureName}</td>
                        {visiblePlans.map(plan => {
                          const pf = plan.features?.find((f) => f.feature.name === featureName)
                          const included = pf?.included
                          const value = pf?.value
                          return (
                            <td key={plan.id} className="py-4 px-6 text-center">
                              <div className="flex justify-center items-center">
                                {included ? (
                                  value != null ? (
                                    <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{value}</span>
                                  ) : (
                                    <CheckCircle className="text-primary h-5 w-5" />
                                  )
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
                  Sí, ofrecemos una garantía de devolución de dinero de 30 días para todos los planes pagos.
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

      <Footer />
    </div>
  )
}
