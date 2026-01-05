import { Card, CardContent } from '@/components/ui/card'
import { Check, ChevronRight, FileText, LayoutDashboard, Mail } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { ClearCartOnMount } from './clear-cart-client'

interface ConfirmationPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const params = await searchParams
  const session = await auth()
  
  // Get invoice number from URL params
  const invoiceNumber = params.orderNumber as string | undefined
  
  let invoice = null
  
  if (invoiceNumber) {
    invoice = await db.invoice.findFirst({
      where: { invoiceNumber },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    })
  }
  
  // If no invoice found by number and user is logged in, get their most recent paid invoice
  if (!invoice && session?.user?.id) {
    invoice = await db.invoice.findFirst({
      where: { 
        userId: session.user.id,
        status: 'PAID',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    })
  }
  
  if (!invoice) {
    redirect('/shop')
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const userEmail = invoice.user?.email || ''
  const paymentMethod = invoice.paymentMethod || 'creditCard'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Client component to clear cart on mount */}
      <ClearCartOnMount />
      
      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Success Header */}
            <div className="text-center py-10 px-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                ¡Gracias por tu compra!
              </h1>
              <p className="text-gray-600 max-w-md mx-auto">
                Tu pago ha sido procesado exitosamente. 
                {userEmail && (
                  <> Se ha enviado un correo de confirmación a <strong>{userEmail}</strong>.</>
                )}
              </p>
            </div>

            {/* Content Grid */}
            <div className="grid lg:grid-cols-5 gap-0 border-t">
              {/* Order Details - Left Side */}
              <div className="lg:col-span-3 p-6 lg:p-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Detalles del Pedido
                </h2>

                {/* Order Info Grid */}
                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Número de Orden
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      #{invoice.invoiceNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Fecha
                    </p>
                    <p className="text-sm text-gray-900">
                      {formatDate(invoice.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Método de Pago
                    </p>
                    <p className="text-sm text-gray-900 flex items-center gap-2">
                      <span className="w-8 h-5 bg-gradient-to-r from-blue-600 to-blue-800 rounded text-white text-[8px] flex items-center justify-center font-bold">
                        {paymentMethod === 'paypal' ? 'PP' : 'VISA'}
                      </span>
                      {paymentMethod === 'niubiz' || paymentMethod === 'creditCard'
                        ? 'Tarjeta de Crédito'
                        : paymentMethod === 'paypal'
                          ? 'PayPal'
                          : 'Transferencia'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Total
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(invoice.total)}
                    </p>
                  </div>
                </div>

                {/* Items Purchased */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Productos Adquiridos
                  </h3>
                  <div className="space-y-4">
                    {invoice.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.product?.image ? (
                            <Image
                              src={item.product.image}
                              alt={item.name}
                              width={48}
                              height={48}
                              className="rounded-lg object-cover"
                            />
                          ) : (
                            <span className="text-white text-lg font-bold">
                              {item.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {item.product?.name || item.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.plan?.name || 'Acceso completo'}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(item.price || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* What's Next - Right Side */}
              <div className="lg:col-span-2 bg-gray-50 p-6 lg:p-8 border-t lg:border-t-0 lg:border-l">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  ¿Qué sigue?
                </h2>

                <div className="space-y-4">
                  {/* Go to Dashboard */}
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border hover:border-primary hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <LayoutDashboard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Ir a Mi Dashboard</p>
                      <p className="text-sm text-gray-500">Comienza a aprender ahora</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                  </Link>

                  {/* View Invoice */}
                  <Link
                    href={`/billing/invoices/${invoice.id}`}
                    className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border hover:border-primary hover:shadow-sm transition-all group text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Ver Factura</p>
                      <p className="text-sm text-gray-500">Descarga tu recibo</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                  </Link>
                </div>

                {/* Need Help Section */}
                <div className="mt-8 p-4 bg-white rounded-xl border">
                  <h3 className="font-medium text-gray-900 mb-2">¿Necesitas ayuda?</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    Si tienes alguna pregunta sobre tu pedido, contacta a nuestro equipo de soporte.
                  </p>
                  <a
                    href="mailto:payments@lingowow.com"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    payments@lingowow.com
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
