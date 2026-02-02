'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import { toast } from 'sonner'

import { useShopStore, AppliedCoupon } from '@/stores/useShopStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PaymentMethodForm } from '@/components/shop/checkout/payment-method-form'
import { CheckoutLoginModal } from '@/components/shop/checkout/login-modal'
import { CheckoutScheduleSelector } from '@/components/checkout/checkout-schedule-selector'
import { CouponInput } from '@/components/shop/checkout/coupon-input'
import { convertRecurringScheduleFromUTC } from '@/lib/utils/date'
import { getBrowserTimezone } from '@/hooks/use-timezone'
import {
  Loader2,
  Lock,
  Trash2,
  ChevronRight,
  CreditCard,
  Wallet,
  ArrowLeft,
  Check,
  Info,
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

type CheckoutStep = 'schedule' | 'review' | 'payment'

const COUNTRIES = [
  'Perú', 'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Ecuador',
  'España', 'Estados Unidos', 'México', 'Paraguay', 'Uruguay', 'Venezuela',
]

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Helper para convertir un slot UTC a hora local para mostrar
const convertSlotToLocalDisplay = (slot: ScheduleSlot, timezone: string): { dayOfWeek: number; startTime: string; endTime: string } => {
  const localData = convertRecurringScheduleFromUTC(
    slot.dayOfWeek,
    slot.startTime,
    slot.endTime,
    timezone
  )
  return localData
}

const CHECKOUT_STATE_KEY = 'checkout-state'

interface CheckoutPersistedState {
  currentStep: CheckoutStep
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

// Helper function to create unique key for cart items (planId + language)
const getCartItemKey = (planId: string, language?: string) => {
  return language ? `${planId}:${language}` : planId
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: authStatus } = useSession()
  const niubizProcessedRef = useRef(false)
  const initialStateLoaded = useRef(false)
  
  const [stateRestored, setStateRestored] = useState(false)
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review')
  const [paymentMethod, setPaymentMethod] = useState<'creditCard' | 'paypal'>('creditCard')
  const [isLoading, setIsLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [saveInfo, setSaveInfo] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    country: 'Perú',
  })

  const [scheduleSelections, setScheduleSelections] = useState<Record<string, {
    schedule: ScheduleSlot[]
    proration: ProrationResult
  }>>({})

  const [planDetails, setPlanDetails] = useState<Record<string, PlanDetails>>({})

  const cartItems = useShopStore((state) => state.cart)
  const removeFromCart = useShopStore((state) => state.removeFromCart)
  const appliedCoupon = useShopStore((state) => state.appliedCoupon)
  const removeCoupon = useShopStore((state) => state.removeCoupon)

  const plansRequiringSchedule = useMemo(() => {
    return cartItems.filter(item => {
      const itemKey = getCartItemKey(item.plan.id, item.language)
      const details = planDetails[itemKey]
      return details?.isSynchronous && details?.courseId
    })
  }, [cartItems, planDetails])

  const requiresScheduleSelection = plansRequiringSchedule.length > 0

  const allSchedulesSelected = useMemo(() => {
    if (!requiresScheduleSelection) return true
    return plansRequiringSchedule.every(item => {
      const itemKey = getCartItemKey(item.plan.id, item.language)
      return scheduleSelections[itemKey]?.schedule?.length > 0
    })
  }, [plansRequiringSchedule, scheduleSelections, requiresScheduleSelection])

  const isRecurrentData = useMemo(() => {
    return cartItems.some(item => {
      const itemKey = getCartItemKey(item.plan.id, item.language)
      const details = planDetails[itemKey]
      return !!details?.billingCycle
    })
  }, [cartItems, planDetails])

  const requiresPlatformAccess = useMemo(() => {
    return cartItems.some(item => {
      const itemKey = getCartItemKey(item.plan.id, item.language)
      const details = planDetails[itemKey]
      return details?.courseId || details?.includesClasses || details?.isDigital
    })
  }, [cartItems, planDetails])

  const calculateCouponDiscount = useCallback((coupon: AppliedCoupon | null, amount: number): number => {
    if (!coupon) return 0
    if (coupon.type === 'PERCENTAGE') {
      const discount = (amount * coupon.value) / 100
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        return coupon.maxDiscount
      }
      return discount
    }
    return Math.min(coupon.value, amount)
  }, [])

  const { subtotal, discount, taxes, total } = useMemo(() => {
    const subtotalAmount = cartItems.reduce((sum, item) => {
      const itemKey = getCartItemKey(item.plan.id, item.language)
      const proration = scheduleSelections[itemKey]?.proration
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
    
    // Si el cupón está restringido a un plan específico, verificar que ese plan esté en el carrito
    if (appliedCoupon.restrictedToPlanId) {
      const planIds = cartItems.map(item => item.plan.id)
      const isValidForCurrentPlans = planIds.includes(appliedCoupon.restrictedToPlanId)
      
      if (!isValidForCurrentPlans) {
        // El cupón no es válido para los planes actuales, removerlo
        removeCoupon()
        toast.info('El cupón ha sido removido porque no aplica para los productos actuales del carrito')
      }
    }
  }, [cartItems, appliedCoupon, removeCoupon])

  useEffect(() => {
    const loadPlanDetails = async () => {
      setLoadingPlans(true)
      const details: Record<string, PlanDetails> = {}
      for (const item of cartItems) {
        // Create unique key for this cart item (planId + language)
        const itemKey = getCartItemKey(item.plan.id, item.language)
        
        try {
          // Skip synthetic plans (products without real plans use "{productId}-default")
          if (item.plan.id.endsWith('-default')) {
            details[itemKey] = {
              id: item.plan.id,
              courseId: null,
              isSynchronous: false,
              classesPerWeek: null,
              classDuration: 0,
              billingCycle: null,
              includesClasses: false,
              isDigital: false, // Products without plans are typically physical/merchandise
            }
            continue
          }
          
          // Pass language to get language-specific courseId from PlanPricing
          const languageParam = item.language ? `?language=${encodeURIComponent(item.language)}` : ''
          const response = await fetch(`/api/plans/${item.plan.id}${languageParam}`)
          if (!response.ok) {
            console.warn(`Plan ${item.plan.id} not found (${response.status})`)
            // Fail-safe: if we can't load plan details, assume it requires platform access
            details[itemKey] = {
              id: item.plan.id,
              courseId: null,
              isSynchronous: false,
              classesPerWeek: null,
              classDuration: 0,
              billingCycle: null,
              includesClasses: false,
              isDigital: true, // Assume digital product requires login
            }
            continue
          }
          const plan = await response.json()
          // Use effectiveCourse/effectiveCourseId which considers language-specific pricing
          const course = plan.effectiveCourse || plan.course || plan.product?.course || null
          const courseId = plan.effectiveCourseId || plan.courseId || course?.id || null
          const isSynchronous = course?.isSynchronous || false
          console.log('Plan loaded:', plan.name, {
            courseId,
            isSynchronous,
            classesPerWeek: plan.classesPerWeek,
            course,
            productCourse: plan.product?.course,
            language: item.language,
          })
          details[itemKey] = {
            id: plan.id,
            courseId,
            isSynchronous,
            classesPerWeek: plan.classesPerWeek || null,
            classDuration: course?.classDuration || 40,
            billingCycle: plan.billingCycle || null,
            includesClasses: plan.includesClasses || false,
            isDigital: plan.product?.isDigital ?? true,
          }
        } catch (error) {
          console.error(`Error loading plan ${item.plan.id}:`, error)
          // Fail-safe: if we can't load plan details, assume it requires platform access
          details[itemKey] = {
            id: item.plan.id,
            courseId: null,
            isSynchronous: false,
            classesPerWeek: null,
            classDuration: 0,
            billingCycle: null,
            includesClasses: false,
            isDigital: true, // Assume digital product requires login
          }
        }
      }
      console.log('All plan details:', details)
      setPlanDetails(details)
      setLoadingPlans(false)
    }
    if (cartItems.length > 0) {
      loadPlanDetails()
    } else {
      setLoadingPlans(false)
    }
  }, [cartItems])

  // Load persisted checkout state on mount
  useEffect(() => {
    if (initialStateLoaded.current) return
    
    try {
      const savedState = sessionStorage.getItem(CHECKOUT_STATE_KEY)
      if (savedState) {
        const parsed: CheckoutPersistedState = JSON.parse(savedState)
        // Only restore if saved within the last 30 minutes
        const thirtyMinutes = 30 * 60 * 1000
        if (Date.now() - parsed.timestamp < thirtyMinutes) {
          console.log('[Checkout] Restoring saved state:', parsed.currentStep, 'scheduleSelections:', parsed.scheduleSelections)
          setScheduleSelections(parsed.scheduleSelections)
          setFormData(prev => ({
            ...prev,
            ...parsed.formData,
          }))
          // Restore step after plans are loaded
          if (parsed.currentStep) {
            setCurrentStep(parsed.currentStep)
          }
        } else {
          // Clear expired state
          sessionStorage.removeItem(CHECKOUT_STATE_KEY)
        }
      }
    } catch (error) {
      console.error('[Checkout] Error loading saved state:', error)
    }
    
    initialStateLoaded.current = true
    setStateRestored(true)
  }, [])

  // Save checkout state when it changes
  useEffect(() => {
    if (!initialStateLoaded.current) return
    
    const stateToSave: CheckoutPersistedState = {
      currentStep,
      scheduleSelections,
      formData,
      timestamp: Date.now(),
    }
    
    try {
      sessionStorage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(stateToSave))
    } catch (error) {
      console.error('[Checkout] Error saving state:', error)
    }
  }, [currentStep, scheduleSelections, formData])

  // Only set to schedule step if no saved state was restored
  useEffect(() => {
    if (!loadingPlans && requiresScheduleSelection) {
      // Check if we have a saved schedule selection - if so, don't force back to schedule step
      const hasRestoredSchedules = Object.keys(scheduleSelections).length > 0
      if (!hasRestoredSchedules) {
        setCurrentStep('schedule')
      }
    }
  }, [loadingPlans, requiresScheduleSelection, scheduleSelections])

  useEffect(() => {
    if (authStatus !== 'loading') {
      if (session?.user) {
        setFormData(prev => ({
          ...prev,
          email: session.user?.email || '',
          firstName: session.user?.name?.split(' ')[0] || '',
          lastName: session.user?.name?.split(' ').slice(1).join(' ') || '',
        }))
      }
      setCheckingAuth(false)
    }
  }, [authStatus, session])

  // Handle Niubiz error returns (success is handled by /api/niubiz/checkout)
  useEffect(() => {
    const niubizError = searchParams.get('niubiz_error')
    const errorMessage = searchParams.get('message')
    
    if (niubizError && !niubizProcessedRef.current) {
      niubizProcessedRef.current = true
      
      // Clean up pending payment data
      sessionStorage.removeItem('niubiz-pending-payment')
      
      // Show appropriate error message
      switch (niubizError) {
        case 'missing_token':
          toast.error('No se recibió el token de transacción. Por favor intente de nuevo.')
          break
        case 'missing_params':
          toast.error('Faltan parámetros de la transacción. Por favor intente de nuevo.')
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
      
      // Clean URL params
      router.replace('/shop/cart/checkout')
    }
  }, [searchParams, router])

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleScheduleSelected = useCallback((itemKey: string, schedule: ScheduleSlot[], proration: ProrationResult) => {
    setScheduleSelections(prev => ({
      ...prev,
      [itemKey]: { schedule, proration }
    }))
  }, [])

  const handleContinue = useCallback(() => {
    if (currentStep === 'schedule') {
      if (!allSchedulesSelected) {
        toast.error('Debes seleccionar un horario para todos los cursos')
        return
      }
      // Require login before proceeding to review
      if (requiresPlatformAccess && !session?.user) {
        setShowLoginModal(true)
        return
      }
      setCurrentStep('review')
    } else if (currentStep === 'review') {
      if (!formData.email || !formData.firstName || !formData.phone) {
        toast.error('Por favor completa todos los campos requeridos')
        return
      }
      sessionStorage.setItem('customer-info', JSON.stringify({
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`,
      }))
      
      if (requiresPlatformAccess && !session?.user) {
        setShowLoginModal(true)
        return
      }
      
      setCurrentStep('payment')
    }
  }, [currentStep, allSchedulesSelected, formData, requiresPlatformAccess, session])

  const handleBack = useCallback(() => {
    if (currentStep === 'review' && requiresScheduleSelection) {
      setCurrentStep('schedule')
    } else if (currentStep === 'payment') {
      setCurrentStep('review')
    } else {
      router.push('/shop')
    }
  }, [currentStep, requiresScheduleSelection, router])

  const handlePaymentSuccess = useCallback((data: unknown) => {
    const anyData = data as { invoice?: { invoiceNumber?: string }; orderId?: string }
    const invoiceNumber = anyData.invoice?.invoiceNumber
    
    // Clear checkout state after successful payment
    sessionStorage.removeItem(CHECKOUT_STATE_KEY)
    useShopStore.getState().clearCart()
    
    // Redirect to confirmation page with invoice number
    setTimeout(() => {
      const url = invoiceNumber 
        ? `/shop/cart/checkout/confirmation?orderNumber=${invoiceNumber}`
        : '/shop/cart/checkout/confirmation'
      router.push(url)
    }, 500)
  }, [router])

  const handlePaymentSubmit = useCallback(() => {
    if (paymentMethod === 'paypal') return
    setIsLoading(true)
    const orderData = {
      orderNumber: `ORD-${Date.now().toString().slice(-8)}`,
      orderDate: new Date().toISOString(),
      totalAmount: total,
      items: cartItems,
      customer: JSON.parse(sessionStorage.getItem('customer-info') || '{}'),
      paymentMethod,
      user: session?.user ? { id: session.user.id, email: session.user.email } : undefined,
    }
    sessionStorage.setItem('last-order', JSON.stringify(orderData))
    setTimeout(() => {
      setIsLoading(false)
      useShopStore.getState().clearCart()
      toast.success('¡Pago procesado correctamente!')
      router.push('/shop/cart/checkout/confirmation')
    }, 2000)
  }, [paymentMethod, total, cartItems, session, router])

  const paypalItems = useMemo(() => {
    console.log('[Checkout] Building paypalItems with scheduleSelections:', scheduleSelections)
    return cartItems.map((item) => {
      const itemKey = getCartItemKey(item.plan.id, item.language)
      const selection = scheduleSelections[itemKey]
      const proration = selection?.proration
      const price = proration?.proratedPrice ?? item.plan.price
      console.log('[Checkout] Item:', item.plan.id, 'schedule:', selection?.schedule, 'language:', item.language)
      return {
        productId: item.product.id,
        planId: item.plan.id,
        name: item.product.title,
        description: item.cartItemDescription || item.product.description || item.plan.name,
        price,
        quantity: item.quantity || 1,
        selectedSchedule: selection?.schedule,
        proratedClasses: proration?.classesFromNow,
        proratedPrice: proration?.proratedPrice,
        language: item.language, // Idioma seleccionado para determinar el curso
      }
    })
  }, [cartItems, scheduleSelections])

  const getStepNumber = useCallback((step: CheckoutStep) => {
    if (requiresScheduleSelection) {
      switch (step) {
        case 'schedule': return 1
        case 'review': return 2
        case 'payment': return 3
      }
    } else {
      switch (step) {
        case 'review': return 1
        case 'payment': return 2
        default: return 1
      }
    }
  }, [requiresScheduleSelection])

  if (checkingAuth || loadingPlans || !stateRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
          <p className="text-slate-600 mb-6">Agrega productos antes de continuar</p>
          <Button onClick={() => router.push('/shop')}>Ir a la Tienda</Button>
        </div>
      </div>
    )
  }

  const steps = requiresScheduleSelection
    ? [{ key: 'schedule', label: 'Horario' }, { key: 'review', label: 'Revisión' }, { key: 'payment', label: 'Pago' }]
    : [{ key: 'review', label: 'Revisión' }, { key: 'payment', label: 'Pago' }]

  return (
    <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '', currency: 'USD' }}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3">
                <Image src="/branding/logo.png" alt="Logo" width={32} height={32} />
                <span className="text-xl font-bold">Lingowow</span>
              </Link>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium hidden sm:block text-green-600">Pago Seguro</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stepper */}
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium mb-8">
            {steps.map((step, index) => {
              const stepNum = index + 1
              const currentNum = getStepNumber(currentStep)
              const isActive = step.key === currentStep
              const isCompleted = stepNum < currentNum
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center ${isActive ? 'text-primary' : isCompleted ? 'text-primary' : 'text-slate-400'}`}>
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 ${isActive || isCompleted ? 'bg-primary text-white' : 'border border-slate-300 text-slate-400'}`}>
                      {isCompleted ? <Check className="h-3 w-3" /> : stepNum}
                    </span>
                    <span className={isActive ? 'font-semibold' : ''}>{step.label}</span>
                  </div>
                  {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300 mx-2" />}
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Schedule Step */}
              {currentStep === 'schedule' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Programa tus Sesiones</h1>
                    <p className="text-slate-600 mt-2">Elige horarios convenientes para tus clases en vivo.</p>
                  </div>
                  {plansRequiringSchedule.map((item) => {
                    const itemKey = getCartItemKey(item.plan.id, item.language)
                    const details = planDetails[itemKey]
                    if (!details?.courseId || !details?.isSynchronous) return null
                    return (
                      <div key={itemKey} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                            {item.product.image ? (
                              <Image src={item.product.image} alt={item.product.title} width={64} height={64} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{item.product.title}</h3>
                            <p className="text-sm text-slate-500">{item.plan.name}</p>
                          </div>
                        </div>
                        <CheckoutScheduleSelector
                          planId={item.plan.id}
                          courseId={details.courseId!}
                          classDuration={details.classDuration}
                          maxClassesPerWeek={details.classesPerWeek || undefined}
                          onScheduleSelected={(schedule, proration) => handleScheduleSelected(itemKey, schedule, proration)}
                        />
                      </div>
                    )
                  })}
                  <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3 text-sm text-blue-800">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p>¿No encuentras un horario que te funcione? <Link href="/contact" className="underline font-bold hover:text-blue-600">Contacta al profesor</Link> directamente.</p>
                  </div>
                </div>
              )}

              {/* Review Step */}
              {currentStep === 'review' && (
                <>
                  <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-900">Información del Cliente</h3>
                      {!session?.user && (
                        <p className="text-sm text-slate-500">¿Ya tienes cuenta? <Link href="/auth/signin" className="text-primary hover:underline">Inicia sesión</Link></p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700 mb-1 block">Correo Electrónico *</Label>
                        <Input id="email" type="email" placeholder="tu@ejemplo.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="firstName" className="text-sm font-medium text-slate-700 mb-1 block">Nombre *</Label>
                        <Input id="firstName" type="text" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-sm font-medium text-slate-700 mb-1 block">Apellidos</Label>
                        <Input id="lastName" type="text" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700 mb-1 block">Teléfono *</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                      </div>
                    </div>
                  </section>

                  <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Dirección de Facturación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="address" className="text-sm font-medium text-slate-700 mb-1 block">Dirección</Label>
                        <Input id="address" type="text" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="city" className="text-sm font-medium text-slate-700 mb-1 block">Ciudad</Label>
                        <Input id="city" type="text" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="zipCode" className="text-sm font-medium text-slate-700 mb-1 block">Código Postal</Label>
                        <Input id="zipCode" type="text" value={formData.zipCode} onChange={(e) => handleInputChange('zipCode', e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="country" className="text-sm font-medium text-slate-700 mb-1 block">País</Label>
                        <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                          <SelectTrigger><SelectValue placeholder="Selecciona un país" /></SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (<SelectItem key={country} value={country}>{country}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Checkbox id="saveInfo" checked={saveInfo} onCheckedChange={(checked) => setSaveInfo(checked === true)} />
                      <Label htmlFor="saveInfo" className="text-sm text-slate-700 cursor-pointer">Guardar esta información para la próxima vez</Label>
                    </div>
                  </section>

                  <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Método de Pago</h3>
                    <p className="text-slate-500 text-sm mb-4">Elige cómo deseas pagar. Ingresarás los detalles en el siguiente paso.</p>
                    <div className="space-y-3">
                      <label className={`relative flex cursor-pointer rounded-lg border p-4 transition-all ${paymentMethod === 'creditCard' ? 'border-primary ring-1 ring-primary bg-white' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
                        <input type="radio" name="payment-method" value="creditCard" checked={paymentMethod === 'creditCard'} onChange={() => setPaymentMethod('creditCard')} className="sr-only" />
                        <span className="flex flex-1"><span className="flex flex-col"><span className="block text-sm font-medium text-slate-900">Tarjeta de Crédito o Débito</span><span className="mt-1 text-sm text-slate-500">Transferencia segura usando tu cuenta bancaria.</span></span></span>
                        <CreditCard className={`h-6 w-6 ${paymentMethod === 'creditCard' ? 'text-primary' : 'text-slate-400'}`} />
                      </label>
                      <label className={`relative flex cursor-pointer rounded-lg border p-4 transition-all ${paymentMethod === 'paypal' ? 'border-primary ring-1 ring-primary bg-white' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
                        <input type="radio" name="payment-method" value="paypal" checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')} className="sr-only" />
                        <span className="flex flex-1"><span className="flex flex-col"><span className="block text-sm font-medium text-slate-900">PayPal</span><span className="mt-1 text-sm text-slate-500">Serás redirigido al sitio web de PayPal.</span></span></span>
                        <Wallet className={`h-6 w-6 ${paymentMethod === 'paypal' ? 'text-primary' : 'text-slate-400'}`} />
                      </label>
                    </div>
                  </section>
                </>
              )}

              {/* Payment Step */}
              {currentStep === 'payment' && (
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Detalles del Pago</h3>
                  <PaymentMethodForm
                    paymentMethod={paymentMethod}
                    onSubmit={handlePaymentSubmit}
                    isLoading={isLoading}
                    paypalData={{ items: paypalItems, total, subtotal, discount }}
                    onPayPalSuccess={handlePaymentSuccess}
                    onNiubizSuccess={handlePaymentSuccess}
                    userEmail={session?.user?.email || formData.email}
                    userFirstName={formData.firstName}
                    userLastName={formData.lastName}
                    isRecurrent={isRecurrentData}
                    allowGuestCheckout={!requiresPlatformAccess}
                    cartItems={cartItems}
                  />
                  <Button variant="ghost" onClick={handleBack} className="mt-6"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button>
                </section>
              )}

              {/* Navigation Buttons */}
              {currentStep !== 'payment' && (
                <div className="flex justify-between items-center pt-4">
                  <Button variant="ghost" onClick={handleBack}><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button>
                  <Button onClick={handleContinue} size="lg" className="bg-primary hover:bg-primary/90">
                    {currentStep === 'review' ? 'Continuar al Pago' : 'Continuar'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900">Resumen del Pedido</h3>
                  </div>
                  <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                    {cartItems.map((item) => {
                      const itemKey = getCartItemKey(item.plan.id, item.language)
                      const proration = scheduleSelections[itemKey]?.proration
                      const price = proration?.proratedPrice ?? item.plan.price
                      return (
                        <div key={itemKey} className="flex gap-4">
                          <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                            {item.product.image ? (
                              <Image src={item.product.image} alt={item.product.title} width={64} height={64} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-sm font-semibold text-slate-900 line-clamp-2">{item.product.title}</p>
                              <p className="text-sm font-bold text-slate-900">${price.toFixed(2)}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{item.plan.name}</p>
                            <div className="mt-2 flex items-center justify-end">
                              <button onClick={() => removeFromCart(item.product.id, item.plan.id, item.language)} className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
                                <Trash2 className="h-4 w-4" /><span>Eliminar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Schedule Summary */}
                  {Object.keys(scheduleSelections).length > 0 && (
                    <div className="px-6 pb-4">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-2">Horarios Seleccionados</div>
                        {Object.entries(scheduleSelections).map(([planId, selection]) => (
                          selection.schedule.map((slot, idx) => {
                            // Convertir de UTC a hora local para mostrar
                            const localSlot = convertSlotToLocalDisplay(slot, getBrowserTimezone())
                            return (
                              <div key={`${planId}-${idx}`} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 mb-2 last:mb-0">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">{DAY_NAMES[localSlot.dayOfWeek]}</span>
                                  <span className="text-xs text-slate-500">{localSlot.startTime} - {localSlot.endTime}</span>
                                </div>
                              </div>
                            )
                          })
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coupon Input */}
                  <div className="px-6 py-4 border-t border-slate-100">
                    <CouponInput 
                      planIds={cartItems.map(item => item.plan.id)} 
                      subtotal={subtotal} 
                    />
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-slate-50 p-6 border-t border-slate-200 space-y-3">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descuento {appliedCoupon?.code && `(${appliedCoupon.code})`}</span>
                        <span className="font-medium">-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    {taxes > 0 && (
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Impuestos</span>
                        <span className="font-medium text-slate-900">${taxes.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t border-slate-200">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Lock className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-900">Pago 100% Seguro</p>
                      <p className="text-xs">Tus datos están protegidos con encriptación SSL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <CheckoutLoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={() => {
          setShowLoginModal(false)
          setCurrentStep('payment')
        }}
        title="Inicia sesión para continuar"
        description="Este producto incluye acceso a contenido de la plataforma. Necesitas una cuenta para acceder después de la compra."
      />
    </PayPalScriptProvider>
  )
}
