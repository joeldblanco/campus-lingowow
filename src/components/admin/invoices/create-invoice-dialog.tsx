'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createInvoice, getProducts } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'Producto requerido'),
  quantity: z.number().min(1, 'Cantidad debe ser mayor a 0'),
  unitPrice: z.number().min(0, 'Precio debe ser mayor o igual a 0'),
})

const invoiceSchema = z.object({
  number: z.string().min(1, 'Número de factura requerido'),
  userId: z.string().min(1, 'Usuario requerido'),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
  dueDate: z.string().optional(),
  couponId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Al menos un item es requerido'),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface Product {
  id: string
  name: string
  price: number
}

interface CreateInvoiceDialogProps {
  children: React.ReactNode
}

export function CreateInvoiceDialog({ children }: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      number: '',
      userId: '',
      status: 'DRAFT',
      dueDate: '',
      couponId: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
    },
  })

  useEffect(() => {
    const generateInvoiceNumber = () => {
      const timestamp = Date.now().toString().slice(-6)
      const number = `INV-${timestamp}`
      form.setValue('number', number)
    }

    if (open) {
      loadProducts()
      generateInvoiceNumber()
    }
  }, [open, form])

  const loadProducts = async () => {
    try {
      const productsData = await getProducts()
      setProducts(productsData)
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar productos')
    }
  }

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    const number = `INV-${timestamp}`
    form.setValue('number', number)
  }

  const addItem = () => {
    const currentItems = form.getValues('items')
    form.setValue('items', [...currentItems, { productId: '', quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    const currentItems = form.getValues('items')
    if (currentItems.length > 1) {
      form.setValue(
        'items',
        currentItems.filter((_, i) => i !== index)
      )
    }
  }

  const updateItemPrice = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      const currentItems = form.getValues('items')
      currentItems[index].unitPrice = product.price
      form.setValue('items', currentItems)
    }
  }

  const onSubmit = async (data: InvoiceFormData) => {
    setIsLoading(true)
    try {
      const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
      const taxAmount = subtotal * 0.1 // 10% tax
      const total = subtotal + taxAmount

      const result = await createInvoice({
        invoiceNumber: data.number,
        userId: data.userId,
        status: data.status,
        subtotal,
        tax: taxAmount,
        discount: 0,
        total,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        couponId: data.couponId || null,
        items: data.items.map(item => ({
          productId: item.productId || null,
          planId: null,
          name: item.productId ? products.find(p => p.id === item.productId)?.name || 'Producto' : 'Producto',
          price: item.unitPrice,
          quantity: item.quantity,
          total: item.quantity * item.unitPrice,
        })),
      })

      if (result.success) {
        toast.success('Factura creada correctamente')
        form.reset()
        setOpen(false)
      } else {
        toast.error(result.error || 'Error al crear la factura')
      }
    } catch {
      toast.error('Error inesperado al crear la factura')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Factura</DialogTitle>
          <DialogDescription>Crea una nueva factura para un cliente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Factura</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="INV-001" {...field} />
                      </FormControl>
                      <Button type="button" variant="outline" onClick={generateInvoiceNumber}>
                        Generar
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID del Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="ID del cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Borrador</SelectItem>
                        <SelectItem value="SENT">Enviada</SelectItem>
                        <SelectItem value="PAID">Pagada</SelectItem>
                        <SelectItem value="OVERDUE">Vencida</SelectItem>
                        <SelectItem value="CANCELLED">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Vencimiento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="couponId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID del Cupón (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="ID del cupón de descuento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Items de la Factura</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </div>

              {form.watch('items').map((_, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Producto</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value)
                              updateItemPrice(index, value)
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar producto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - ${product.price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio Unitario</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    {form.watch('items').length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creando...' : 'Crear Factura'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
