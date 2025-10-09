import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, ExternalLink, Eye, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

type OrderStatus = 'completado' | 'pendiente' | 'cancelado'

type OrderItem = {
  id: string
  name: string
  type: 'curso' | 'producto' | 'programa'
  price: number
  quantity: number
}

type Order = {
  id: string
  orderNumber: string
  date: string
  status: OrderStatus
  total: number
  items: OrderItem[]
  paymentMethod: string
}

interface OrderHistoryProps {
  orders: Order[]
}

export default function OrderHistory({ orders }: OrderHistoryProps) {
  const [filter, setFilter] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('todos')

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const handleDownloadInvoice = (orderNumber: string) => {
    toast.info(`Descargando factura del pedido #${orderNumber}...`)
    // Lógica para descargar la factura
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completado':
        return <Badge className="bg-green-500">Completado</Badge>
      case 'pendiente':
        return <Badge className="bg-amber-500">Pendiente</Badge>
      case 'cancelado':
        return <Badge className="bg-red-500">Cancelado</Badge>
      default:
        return null
    }
  }

  const filterOrders = (orders: Order[]) => {
    // Filtrar por estado si no está en "todos"
    let filtered =
      activeTab === 'todos' ? orders : orders.filter((order) => order.status === activeTab)

    // Filtrar por búsqueda si hay texto en el input
    if (filter) {
      const lowercaseFilter = filter.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(lowercaseFilter) ||
          order.items.some((item) => item.name.toLowerCase().includes(lowercaseFilter))
      )
    }

    return filtered
  }

  const filteredOrders = filterOrders(orders)

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pedidos</CardTitle>
          <CardDescription>
            Visualiza y gestiona todos tus pedidos realizados en Lingowow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="completado">Completados</TabsTrigger>
                <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
                <TabsTrigger value="cancelado">Cancelados</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative ml-4">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedidos..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8 w-full max-w-xs"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron pedidos</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido #</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{formatDate(order.date)}</TableCell>
                    <TableCell>{formatCurrency(order.total)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(order.orderNumber)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        <Link href={`/dashboard/pedidos/${order.id}`} passHref>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Mis Cursos y Programas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders
            .flatMap((order) =>
              order.items.filter((item) => item.type === 'curso' || item.type === 'programa')
            )
            .slice(0, 3) // Limitamos a los 3 primeros como ejemplo
            .map((item, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">{item.name}</h3>
                  <Badge variant="outline" className="mb-4 capitalize">
                    {item.type}
                  </Badge>
                  <div className="flex justify-end">
                    <Link
                      href={`/dashboard/${item.type === 'curso' ? 'cursos' : 'programas'}/${item.id}`}
                      passHref
                    >
                      <Button size="sm">
                        Ir al contenido
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
        {filteredOrders.some((order) =>
          order.items.some((item) => item.type === 'curso' || item.type === 'programa')
        ) && (
          <div className="mt-4 text-center">
            <Link href="/my-courses" passHref>
              <Button variant="outline">Ver todos mis cursos</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
