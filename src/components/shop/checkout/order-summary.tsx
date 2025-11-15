import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

type OrderSummaryProduct = {
  id: string
  name: string
  description: string
  price: number
  quantity: number
}

interface OrderSummaryProps {
  products: OrderSummaryProduct[]
  subtotal: number
  discount?: number
  total: number
}

export function OrderSummary({
  products,
  subtotal,
  discount = 0,
  total,
}: OrderSummaryProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del Pedido</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="flex justify-between">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">{product.description}</p>
                <Badge variant="outline" className="mt-1">
                  Cantidad: {product.quantity}
                </Badge>
              </div>
              <p className="font-medium">{formatCurrency(product.price * product.quantity)}</p>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <div className="flex justify-between">
            <p className="text-muted-foreground">Subtotal</p>
            <p>{formatCurrency(subtotal)}</p>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <p>Descuento</p>
              <p>-{formatCurrency(discount)}</p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between font-bold text-lg">
          <p>Total</p>
          <p>{formatCurrency(total)}</p>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Los precios incluyen IVA cuando aplica.</p>
          <p className="mt-2">
            Al finalizar la compra, aceptas nuestros{' '}
            <a href="/terms" className="text-primary underline">
              Términos y Condiciones
            </a>{' '}
            y{' '}
            <a href="/privacy" className="text-primary underline">
              Política de Privacidad
            </a>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
