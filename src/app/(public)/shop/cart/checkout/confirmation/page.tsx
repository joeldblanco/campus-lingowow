'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { OrderDetails } from '@/types/shop'
import { Check, Download, ExternalLink, Loader2, PackageOpen, ShoppingBag } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ConfirmationPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificamos si hay cursos o merchandising en la orden
  const hasCourses = orderDetails?.items.some((item) => item.product.type === 'course') || false
  const hasMerchandise =
    orderDetails?.items.some((item) => item.product.type === 'merchandise') || false

  useEffect(() => {
    // Recuperamos los detalles del pedido del sessionStorage
    const orderData = sessionStorage.getItem('last-order')

    if (!orderData) {
      // Si no hay datos de pedido, redirigimos a la tienda
      router.push('/shop')
      return
    }

    try {
      const parsedOrder = JSON.parse(orderData) as OrderDetails
      // Validación adicional de tipos podría implementarse aquí
      setOrderDetails(parsedOrder)
    } catch (error) {
      console.error('Error al analizar los datos del pedido:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Función auxiliar para formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!orderDetails) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Pedido no encontrado</CardTitle>
            <CardDescription>No se encontraron detalles del pedido</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6">Ha ocurrido un error al recuperar los detalles de tu pedido.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push('/shop')}>Volver a la Tienda</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-primary/10 rounded-full p-4">
            <Check className="h-12 w-12 text-primary" />
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">¡Pedido completado con éxito!</CardTitle>
            <CardDescription>
              Tu pedido #{orderDetails.orderNumber} ha sido recibido y está siendo procesado
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Información general del pedido */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">Información del pedido</h3>
                <p className="text-sm text-muted-foreground">Pedido: #{orderDetails.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  Fecha: {new Date(orderDetails.orderDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(orderDetails.totalAmount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Método de pago:{' '}
                  {orderDetails.paymentMethod === 'creditCard'
                    ? 'Tarjeta de Crédito/Débito'
                    : orderDetails.paymentMethod === 'paypal'
                      ? 'PayPal'
                      : 'Transferencia Bancaria'}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Información del cliente</h3>
                <p className="text-sm text-muted-foreground">
                  Nombre: {orderDetails.customer.firstName} {orderDetails.customer.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Email: {orderDetails.customer.email}
                </p>
                {orderDetails.customer.phone && (
                  <p className="text-sm text-muted-foreground">
                    Teléfono: {orderDetails.customer.phone}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Resumen de productos */}
            <div>
              <h3 className="font-medium mb-3">Productos</h3>
              <ul className="space-y-3">
                {orderDetails.items.map((item, index) => (
                  <li key={index} className="flex items-start justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{item.product.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.plan.name}{' '}
                        {item.quantity && item.quantity > 1 ? `(x${item.quantity})` : ''}
                      </p>
                      <div className="mt-1 inline-flex items-center text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-1">
                        {item.product.type === 'course' ? 'Curso' : 'Merchandising'}
                      </div>
                    </div>
                    <p className="text-right">
                      {formatCurrency(item.plan.price * (item.quantity || 1))}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-4 text-right">
                <p className="text-sm text-muted-foreground">
                  Subtotal: {formatCurrency(orderDetails.totalAmount * 0.93)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Impuestos (7%): {formatCurrency(orderDetails.totalAmount * 0.07)}
                </p>
                <p className="font-medium">Total: {formatCurrency(orderDetails.totalAmount)}</p>
              </div>
            </div>

            <Separator />

            {/* Sección específica para cursos */}
            {hasCourses && (
              <div className="bg-primary/5 p-4 rounded-md">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <ExternalLink className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Acceso a tus cursos</h3>
                    <p className="text-sm mb-3">
                      {session ? (
                        <>Ya puedes acceder a tus cursos desde tu cuenta en la plataforma.</>
                      ) : (
                        <>Para acceder a tus cursos, inicia sesión en tu cuenta.</>
                      )}
                    </p>
                    <Button asChild>
                      <Link href="/my-courses">Ir a Mis Cursos</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Sección específica para merchandising */}
            {hasMerchandise && orderDetails.customer.needsShipping && (
              <div className="bg-primary/5 p-4 rounded-md">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <PackageOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Envío de productos</h3>
                    <p className="text-sm mb-1">
                      Tu pedido de merchandising será procesado y enviado en las próximas 24-48
                      horas hábiles.
                    </p>
                    <p className="text-sm mb-3">
                      Recibirás un email con la información de seguimiento cuando tu pedido sea
                      enviado.
                    </p>
                    {orderDetails.customer.address && (
                      <div className="text-sm text-muted-foreground border p-2 rounded mb-3">
                        <p className="font-medium">Dirección de envío:</p>
                        <p>{orderDetails.customer.address}</p>
                        {orderDetails.customer.city && orderDetails.customer.postalCode && (
                          <p>
                            {orderDetails.customer.city}, {orderDetails.customer.postalCode}
                          </p>
                        )}
                        {orderDetails.customer.country && <p>{orderDetails.customer.country}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Factura */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="text-sm font-medium">¿Necesitas una factura?</span>
              </div>
              <Button variant="outline" size="sm">
                Descargar Factura
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => router.push('/shop')}
              className="flex items-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Volver a la tienda
            </Button>
            {session && (
              <Button asChild>
                <Link href="/dashboard">Ir al Dashboard</Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
