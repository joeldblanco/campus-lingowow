/* Hallmark · redesign · checkout 1-página Niubiz-only
 * theme: project tokens (primary #137fec) · display: Lexend · body: Geist
 * preserves: schedule/proration, timezone, coupon, guest, 3DS persistence, Niubiz wiring
 */
'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'

import { useShopStore, AppliedCoupon } from '@/stores/useShopStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { PaymentMethodForm } from '@/components/shop/checkout/payment-method-form'
import { CheckoutLoginModal } from '@/components/shop/checkout/login-modal'
import { CheckoutScheduleSelector } from '@/components/checkout/checkout-schedule-selector'
import { CouponInput } from '@/components/shop/checkout/coupon-input'
import { convertRecurringScheduleFromUTC } from '@/lib/utils/date'
import { useTimezone } from '@/hooks/use-timezone'
import { COUNTRIES } from '@/lib/constants/countries'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Lock,
  Trash2,
  ArrowLeft,
  CalendarClock,
  User,
  MapPin,
  CreditCard,
  Check,
  ChevronsUpDown,
} from 'lucide-react'

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface ProrationResult {
  planId: string
  planName: string
  originalPrice: number
  proratedPrice: number
  classesFromNow: number
  totalClassesInFullPeriod: number
  classesPerWeek: number
  periodStart: string
  periodEnd: string
  enrollmentStart: string
  daysRemaining: number
  weeksRemaining: number
  allowProration: boolean
  schedule: ScheduleSlot[]
}

interface PlanDetails {
  id: string
  courseId: string | null
  isSynchronous: boolean
  classesPerWeek: number | null
  classDuration: number
  billingCycle: string | null
  includesClasses: boolean
  isDigital: boolean
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Helper para convertir un slot UTC a hora local para mostrar
const convertSlotToLocalDisplay = (
  slot: ScheduleSlot,
  timezone: string
): { dayOfWeek: number; startTime: string; endTime: string } => {
  return convertRecurringScheduleFromUTC(slot.dayOfWeek, slot.startTime, slot.endTime, timezone)
}

const CHECKOUT_STATE_KEY = 'checkout-state'

interface CheckoutPersistedState {
  scheduleSelections: Record<string, { schedule: ScheduleSlot[]; proration: ProrationResult }>
  formData: {
    email: string
    firstName: string
    lastName: string
    phone: string
    address: string
    city: string
    zipCode: string
    country: string
  }
  timestamp: number
}

// Clave única por item del carrito (planId + idioma)
const getCartItemKey = (planId: string, language?: string) =>
  language ? `${planId}:${language}` : planId

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: authStatus } = useSession()
  // Zona horaria de la sesión (la del usuario suplantado durante impersonación);
  // cae al navegador solo para invitados sin sesión.
  const { timezone: userTimezone } = useTimezone()
  const niubizProcessedRef = useRef(false)
  const initialStateLoaded = useRef(false)

  const [stateRestored, setStateRestored] = useState(false)
  const [isLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
  })

  const [scheduleSelections, setScheduleSelections] = useState<
    Record<string, { schedule: ScheduleSlot[]; proration: ProrationResult }>
  >({})

  const [planDetails, setPlanDetails] = useState<Record<string, PlanDetails>>({})

  const cartItems = useShopStore((state) => state.cart)
  const removeFromCart = useShopStore((state) => state.removeFromCart)
  const appliedCoupon = useShopStore((state) => state.appliedCoupon)
  const removeCoupon = useShopStore((state) => state.removeCoupon)

  const plansRequiringSchedule = useMemo(() => {
    return cartItems.filter((item) => {
      const details = planDetails[getCartItemKey(item.plan.id, item.language)]
      return details?.isSynchronous && details?.courseId
    })
  }, [cartItems, planDetails])

  const requiresScheduleSelection = plansRequiringSchedule.length > 0

  const allSchedulesSelected = useMemo(() => {
    if (!requiresScheduleSelection) return true
    return plansRequiringSchedule.every((item) => {
      const itemKey = getCartItemKey(item.plan.id, item.language)
      return scheduleSelections[itemKey]?.schedule?.length > 0
    })
  }, [plansRequiringSchedule, scheduleSelections, requiresScheduleSelection])

  const isRecurrentData = useMemo(() => {
    return cartItems.some((item) => {
      const details = planDetails[getCartItemKey(item.plan.id, item.language)]
      return !!details?.billingCycle
    })
  }, [cartItems, planDetails])

  const requiresPlatformAccess = useMemo(() => {
    return cartItems.some((item) => {
      const details = planDetails[getCartItemKey(item.plan.id, item.language)]
      return details?.courseId || details?.includesClasses || details?.isDigital
    })
  }, [cartItems, planDetails])

  const calculateCouponDiscount = useCallback(
    (coupon: AppliedCoupon | null, amount: number): number => {
      if (!coupon) return 0
      if (coupon.type === 'PERCENTAGE') {
        const discount = (amount * coupon.value) / 100
        if (coupon.maxDiscount && discount > coupon.maxDiscount) return coupon.maxDiscount
        return discount
      }
      return Math.min(coupon.value, amount)
    },
    []
  )

  const { subtotal, discount, taxes, total } = useMemo(() => {
    const subtotalAmount = cartItems.reduce((sum, item) => {
      const proration = scheduleSelections[getCartItemKey(item.plan.id, item.language)]?.proration
      const price = proration?.proratedPrice ?? item.plan.price
      return sum + price * (item.quantity || 1)
    }, 0)
    const discountAmount = calculateCouponDiscount(appliedCoupon, subtotalAmount)
    return {
      subtotal: subtotalAmount,
      discount: discountAmount,
      taxes: 0,
      total: subtotalAmount - discountAmount,
    }
  }, [cartItems, scheduleSelections, appliedCoupon, calculateCouponDiscount])

  // Validar cupón cuando cambian los items del carrito
  useEffect(() => {
    if (!appliedCoupon) return
    if (appliedCoupon.restrictedToPlanId) {
      const planIds = cartItems.map((item) => item.plan.id)
      if (!planIds.includes(appliedCoupon.restrictedToPlanId)) {
        removeCoupon()
        toast.info(
          'El cupón ha sido removido porque no aplica para los productos actuales del carrito'
        )
      }
    }
  }, [cartItems, appliedCoupon, removeCoupon])

  // Cargar detalles de cada plan (define si requiere horario / acceso a plataforma)
  useEffect(() => {
    const loadPlanDetails = async () => {
      setLoadingPlans(true)
      const details: Record<string, PlanDetails> = {}
      for (const item of cartItems) {
        const itemKey = getCartItemKey(item.plan.id, item.language)
        // Fail-safe: si no se puede cargar, asumir que requiere acceso a plataforma (digital).
        const fallback: PlanDetails = {
          id: item.plan.id,
          courseId: null,
          isSynchronous: false,
          classesPerWeek: null,
          classDuration: 0,
          billingCycle: null,
          includesClasses: false,
          isDigital: true,
        }
        try {
          // Planes sintéticos (productos sin plan real usan "{productId}-default")
          if (item.plan.id.endsWith('-default')) {
            details[itemKey] = { ...fallback, isDigital: false }
            continue
          }
          const languageParam = item.language
            ? `?language=${encodeURIComponent(item.language)}`
            : ''
          const response = await fetch(`/api/plans/${item.plan.id}${languageParam}`)
          if (!response.ok) {
            details[itemKey] = fallback
            continue
          }
          const plan = await response.json()
          // Usar effectiveCourse/effectiveCourseId que considera el pricing por idioma
          const course = plan.effectiveCourse || plan.course || plan.product?.course || null
          const courseId = plan.effectiveCourseId || plan.courseId || course?.id || null
          details[itemKey] = {
            id: plan.id,
            courseId,
            isSynchronous: course?.isSynchronous || false,
            classesPerWeek: plan.classesPerWeek || null,
            classDuration: course?.classDuration || 40,
            billingCycle: plan.billingCycle || null,
            includesClasses: plan.includesClasses || false,
            isDigital: plan.product?.isDigital ?? true,
          }
        } catch {
          details[itemKey] = fallback
        }
      }
      setPlanDetails(details)
      setLoadingPlans(false)
    }
    if (cartItems.length > 0) loadPlanDetails()
    else setLoadingPlans(false)
  }, [cartItems])

  // Restaurar estado persistido al montar (sobrevive el redirect 3DS de Niubiz)
  useEffect(() => {
    if (initialStateLoaded.current) return
    try {
      const savedState = sessionStorage.getItem(CHECKOUT_STATE_KEY)
      if (savedState) {
        const parsed: CheckoutPersistedState = JSON.parse(savedState)
        const thirtyMinutes = 30 * 60 * 1000
        if (Date.now() - parsed.timestamp < thirtyMinutes) {
          setScheduleSelections(parsed.scheduleSelections)
          setFormData((prev) => ({ ...prev, ...parsed.formData }))
        } else {
          sessionStorage.removeItem(CHECKOUT_STATE_KEY)
        }
      }
    } catch (error) {
      console.error('[Checkout] Error loading saved state:', error)
    }
    initialStateLoaded.current = true
    setStateRestored(true)
  }, [])

  // Persistir estado cuando cambia (form + horarios) para el round-trip de Niubiz
  useEffect(() => {
    if (!initialStateLoaded.current) return
    const stateToSave: CheckoutPersistedState = {
      scheduleSelections,
      formData,
      timestamp: Date.now(),
    }
    try {
      sessionStorage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(stateToSave))
      // customer-info lo leen los handlers de retorno de Niubiz
      sessionStorage.setItem(
        'customer-info',
        JSON.stringify({ ...formData, fullName: `${formData.firstName} ${formData.lastName}` })
      )
    } catch (error) {
      console.error('[Checkout] Error saving state:', error)
    }
  }, [scheduleSelections, formData])

  // Prefill desde la sesión
  useEffect(() => {
    if (authStatus !== 'loading') {
      if (session?.user) {
        setFormData((prev) => ({
          ...prev,
          email: prev.email || session.user?.email || '',
          firstName: prev.firstName || session.user?.name?.split(' ')[0] || '',
          lastName: prev.lastName || session.user?.name?.split(' ').slice(1).join(' ') || '',
        }))
      }
      setCheckingAuth(false)
    }
  }, [authStatus, session])

  // Manejar retornos de error de Niubiz (el éxito lo maneja /api/niubiz/checkout)
  useEffect(() => {
    const niubizError = searchParams.get('niubiz_error')
    const errorMessage = searchParams.get('message')
    if (niubizError && !niubizProcessedRef.current) {
      niubizProcessedRef.current = true
      sessionStorage.removeItem('niubiz-pending-payment')
      switch (niubizError) {
        case 'missing_token':
          toast.error('No se recibió el token de transacción. Por favor intente de nuevo.')
          break
        case 'missing_params':
          toast.error('Faltan parámetros de la transacción. Por favor intente de nuevo.')
          break
        case 'missing_billing_info':
          toast.error('Para pagar con tarjeta debes completar la dirección de facturación.')
          break
        case 'auth_failed':
          toast.error(errorMessage ? decodeURIComponent(errorMessage) : 'El pago fue rechazado.')
          break
        case 'server_error':
          toast.error('Error del servidor al procesar el pago. Por favor intente de nuevo.')
          break
        default:
          toast.error('Error al procesar el pago. Por favor intente de nuevo.')
      }
      router.replace('/shop/cart/checkout')
    }
  }, [searchParams, router])

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleScheduleSelected = useCallback(
    (itemKey: string, schedule: ScheduleSlot[], proration: ProrationResult) => {
      setScheduleSelections((prev) => ({ ...prev, [itemKey]: { schedule, proration } }))
    },
    []
  )

  // Plan síncrono a agendar. Con buyNow el carrito tiene 1 item → a lo sumo uno.
  const scheduleItem = plansRequiringSchedule[0]
  const scheduleItemKey = scheduleItem
    ? getCartItemKey(scheduleItem.plan.id, scheduleItem.language)
    : null
  const scheduleDetails = scheduleItemKey ? planDetails[scheduleItemKey] : undefined

  const handlePaymentSuccess = useCallback(
    (data: unknown) => {
      const anyData = data as { invoice?: { invoiceNumber?: string }; orderId?: string }
      const invoiceNumber = anyData.invoice?.invoiceNumber
      sessionStorage.removeItem(CHECKOUT_STATE_KEY)
      useShopStore.getState().clearCart()
      setTimeout(() => {
        router.push(
          invoiceNumber
            ? `/shop/cart/checkout/confirmation?orderNumber=${invoiceNumber}`
            : '/shop/cart/checkout/confirmation'
        )
      }, 500)
    },
    [router]
  )

  // Items para Niubiz (pasados como invoiceData). Incluye horario + proración por item.
  const invoiceItems = useMemo(() => {
    return cartItems.map((item) => {
      const selection = scheduleSelections[getCartItemKey(item.plan.id, item.language)]
      const proration = selection?.proration
      return {
        productId: item.product.id,
        planId: item.plan.id,
        name: item.product.title,
        description: item.cartItemDescription || item.product.description || item.plan.name,
        price: proration?.proratedPrice ?? item.plan.price,
        quantity: item.quantity || 1,
        selectedSchedule: selection?.schedule,
        proratedClasses: proration?.classesFromNow,
        proratedPrice: proration?.proratedPrice,
        language: item.language,
      }
    })
  }, [cartItems, scheduleSelections])

  // ---- Gating: qué falta para habilitar el pago ----
  const contactComplete = Boolean(formData.email && formData.firstName && formData.phone)
  const billingComplete = Boolean(
    formData.address.trim() &&
      formData.city.trim() &&
      formData.zipCode.trim() &&
      formData.country.trim()
  )
  const authOk = !requiresPlatformAccess || Boolean(session?.user)
  const canPay = contactComplete && billingComplete && allSchedulesSelected && authOk

  if (checkingAuth || loadingPlans || !stateRestored) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="font-sans text-sm">Preparando tu inscripción…</p>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <h1 className="font-lexend text-2xl font-semibold text-slate-900">
            Tu carrito está vacío
          </h1>
          <p className="mt-2 text-slate-600">Agrega un plan antes de continuar.</p>
          <Button className="mt-6" onClick={() => router.push('/shop')}>
            Ir a la tienda
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/branding/logo.png" alt="Lingowow" width={32} height={32} />
            <span className="font-lexend text-lg font-semibold text-slate-900">Lingowow</span>
          </Link>
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            Pago seguro
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-lexend text-3xl font-semibold tracking-tight text-slate-900">
            Finaliza tu inscripción
          </h1>
          <p className="mt-1.5 text-slate-600">
            Confirma tu horario, tus datos y paga en un solo paso.
          </p>
        </div>

        {/* Horario — ancho completo (sin Resumen al lado para que quepan los 7 días) */}
        {requiresScheduleSelection && scheduleItem && scheduleDetails?.courseId && (
          <section className="mb-10">
            <SectionHead
              icon={<CalendarClock className="h-4 w-4" />}
              step="1"
              title="Tu horario"
              hint="Elige tus horarios; te asignamos un profesor que los cubra."
            />
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3">
                <ProductThumb
                  image={scheduleItem.product.image}
                  title={scheduleItem.product.title}
                />
                <div>
                  <h3 className="font-lexend font-medium text-slate-900">
                    {scheduleItem.product.title}
                  </h3>
                  <p className="text-sm text-slate-500">{scheduleItem.plan.name}</p>
                </div>
              </div>
              <CheckoutScheduleSelector
                planId={scheduleItem.plan.id}
                courseId={scheduleDetails.courseId}
                classDuration={scheduleDetails.classDuration}
                maxClassesPerWeek={scheduleDetails.classesPerWeek || undefined}
                onScheduleSelected={(s, p) => handleScheduleSelected(scheduleItemKey!, s, p)}
              />
              <p className="text-sm text-slate-500">
                ¿No encuentras un horario?{' '}
                <Link href="/contact" className="font-medium text-primary hover:underline">
                  Escríbele al profesor
                </Link>
                .
              </p>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* ---------- Flujo (izquierda) ---------- */}
          <div className="space-y-10 lg:col-span-7">
            {/* Datos de contacto */}
            <section>
              <div className="flex items-center justify-between">
                <SectionHead
                  icon={<User className="h-4 w-4" />}
                  step={requiresScheduleSelection ? '2' : '1'}
                  title="Tus datos"
                />
                {!session?.user && (
                  <span className="text-sm text-slate-500">
                    ¿Ya tienes cuenta?{' '}
                    <Link href="/auth/signin" className="font-medium text-primary hover:underline">
                      Inicia sesión
                    </Link>
                  </span>
                )}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2">
                <Field
                  id="email"
                  label="Correo electrónico"
                  required
                  className="md:col-span-2"
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={formData.email}
                  onChange={(v) => handleInputChange('email', v)}
                />
                <Field
                  id="firstName"
                  label="Nombre"
                  required
                  value={formData.firstName}
                  onChange={(v) => handleInputChange('firstName', v)}
                />
                <Field
                  id="lastName"
                  label="Apellidos"
                  value={formData.lastName}
                  onChange={(v) => handleInputChange('lastName', v)}
                />
                <Field
                  id="phone"
                  label="Teléfono"
                  required
                  className="md:col-span-2"
                  type="tel"
                  value={formData.phone}
                  onChange={(v) => handleInputChange('phone', v)}
                />
              </div>
            </section>

            {/* 3 · Facturación (Niubiz exige dirección) */}
            <section>
              <SectionHead
                icon={<MapPin className="h-4 w-4" />}
                step={requiresScheduleSelection ? '3' : '2'}
                title="Facturación"
                hint="Requerido para el pago con tarjeta"
              />
              <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2">
                <Field
                  id="address"
                  label="Dirección"
                  required
                  className="md:col-span-2"
                  value={formData.address}
                  onChange={(v) => handleInputChange('address', v)}
                />
                <Field
                  id="city"
                  label="Ciudad"
                  required
                  value={formData.city}
                  onChange={(v) => handleInputChange('city', v)}
                />
                <Field
                  id="zipCode"
                  label="Código postal"
                  required
                  value={formData.zipCode}
                  onChange={(v) => handleInputChange('zipCode', v)}
                />
                <CountryField
                  className="md:col-span-2"
                  value={formData.country}
                  onChange={(v) => handleInputChange('country', v)}
                />
              </div>
            </section>

            {/* 4 · Pago */}
            <section>
              <SectionHead
                icon={<CreditCard className="h-4 w-4" />}
                step={requiresScheduleSelection ? '4' : '3'}
                title="Pago"
              />
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-6">
                {!authOk ? (
                  <div className="text-center">
                    <p className="text-slate-600">
                      Este plan incluye acceso a la plataforma. Inicia sesión o crea tu cuenta para
                      continuar.
                    </p>
                    <Button className="mt-4" onClick={() => setShowLoginModal(true)}>
                      Iniciar sesión / Crear cuenta
                    </Button>
                  </div>
                ) : !canPay ? (
                  <p className="text-center text-sm text-slate-500">
                    Completa{' '}
                    {!allSchedulesSelected
                      ? 'tu horario'
                      : !contactComplete
                        ? 'tus datos'
                        : 'tu dirección de facturación'}{' '}
                    para habilitar el pago.
                  </p>
                ) : (
                  <PaymentMethodForm
                    paymentMethod="creditCard"
                    onSubmit={() => {}}
                    isLoading={isLoading}
                    paypalData={{
                      items: invoiceItems,
                      total,
                      subtotal,
                      discount,
                      currency: 'USD',
                      couponId: appliedCoupon?.id,
                    }}
                    onNiubizSuccess={handlePaymentSuccess}
                    userEmail={session?.user?.email || formData.email}
                    userFirstName={formData.firstName}
                    userLastName={formData.lastName}
                    isRecurrent={isRecurrentData}
                    allowGuestCheckout={!requiresPlatformAccess}
                    cartItems={cartItems}
                    customerInfo={{
                      email: session?.user?.email || formData.email,
                      firstName: formData.firstName,
                      lastName: formData.lastName,
                      address: formData.address,
                      city: formData.city,
                      country: formData.country,
                      zipCode: formData.zipCode,
                    }}
                  />
                )}
              </div>
            </section>

            <Button
              variant="ghost"
              onClick={() => router.push('/shop')}
              className="text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la tienda
            </Button>
          </div>

          {/* ---------- Resumen (derecha, sticky) ---------- */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-xl border border-slate-200 bg-white">
              <h2 className="border-b border-slate-100 px-6 py-4 font-lexend text-base font-semibold text-slate-900">
                Resumen
              </h2>

              {/* Items */}
              <div className="max-h-[360px] space-y-4 overflow-y-auto px-6 py-5">
                {cartItems.map((item) => {
                  const itemKey = getCartItemKey(item.plan.id, item.language)
                  const proration = scheduleSelections[itemKey]?.proration
                  const price = proration?.proratedPrice ?? item.plan.price
                  return (
                    <div key={itemKey} className="flex gap-4">
                      <ProductThumb image={item.product.image} title={item.product.title} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-medium text-slate-900">
                            {item.product.title}
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            ${price.toFixed(2)}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{item.plan.name}</p>
                        <button
                          onClick={() =>
                            removeFromCart(item.product.id, item.plan.id, item.language)
                          }
                          className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Horarios elegidos */}
              {Object.keys(scheduleSelections).length > 0 && (
                <div className="border-t border-slate-100 px-6 py-4">
                  <p className="mb-2 text-xs font-medium text-slate-500">Horarios elegidos</p>
                  <div className="space-y-1.5">
                    {Object.entries(scheduleSelections).flatMap(([planId, selection]) =>
                      selection.schedule.map((slot, idx) => {
                        const localSlot = convertSlotToLocalDisplay(slot, userTimezone)
                        return (
                          <div
                            key={`${planId}-${idx}`}
                            className="flex items-center justify-between text-sm text-slate-600"
                          >
                            <span className="font-medium text-slate-700">
                              {DAY_NAMES[localSlot.dayOfWeek]}
                            </span>
                            <span className="tabular-nums">
                              {localSlot.startTime}–{localSlot.endTime}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Cupón */}
              <div className="border-t border-slate-100 px-6 py-4">
                <CouponInput planIds={cartItems.map((item) => item.plan.id)} subtotal={subtotal} />
              </div>

              {/* Totales */}
              <div className="space-y-2.5 border-t border-slate-100 px-6 py-5">
                <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                {discount > 0 && (
                  <Row
                    label={`Descuento${appliedCoupon?.code ? ` (${appliedCoupon.code})` : ''}`}
                    value={`-$${discount.toFixed(2)}`}
                    accent
                  />
                )}
                {taxes > 0 && <Row label="Impuestos" value={`$${taxes.toFixed(2)}`} />}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-lexend text-base font-semibold text-slate-900">Total</span>
                  <span className="font-lexend text-base font-semibold tabular-nums text-slate-900">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="flex items-center gap-1.5 border-t border-slate-100 px-6 py-3.5 text-xs text-slate-400">
                <Lock className="h-3 w-3" />
                Pago protegido con encriptación SSL
              </p>
            </div>
          </div>
        </div>
      </main>

      <CheckoutLoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={() => setShowLoginModal(false)}
        title="Inicia sesión para continuar"
        description="Este producto incluye acceso a contenido de la plataforma. Necesitas una cuenta para acceder después de la compra."
      />
    </div>
  )
}

/* ----------------------- Subcomponentes locales ----------------------- */

function SectionHead({
  icon,
  step,
  title,
  hint,
}: {
  icon: React.ReactNode
  step: string
  title: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <h2 className="font-lexend text-lg font-semibold text-slate-900">
          <span className="mr-1.5 text-slate-300">{step}</span>
          {title}
        </h2>
        {hint && <p className="text-sm text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function CountryField({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm font-medium text-slate-700">
        País<span className="ml-0.5 text-primary">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value ? value : <span className="text-slate-400">Selecciona tu país</span>}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar país…" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={c.name}
                    onSelect={() => {
                      onChange(c.name)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === c.name ? 'opacity-100' : 'opacity-0')}
                    />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={accent ? 'text-green-600' : 'text-slate-600'}>{label}</span>
      <span className={`tabular-nums ${accent ? 'font-medium text-green-600' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  )
}

function ProductThumb({ image, title }: { image?: string | null; title: string }) {
  return (
    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
      {image ? (
        <Image
          src={image}
          alt={title}
          width={56}
          height={56}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-lexend text-sm font-semibold text-slate-400">
          {title.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  )
}
