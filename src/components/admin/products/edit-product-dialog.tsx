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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateProduct, getCategories } from '@/lib/actions/commercial'
import { getCoursesForProducts } from '@/lib/actions/courses'
import { toast } from 'sonner'
import { Category } from '@/types/category'
import { ImageSelector } from './image-selector'

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido'),
  description: z.string().optional(),
  shortDesc: z.string().optional(),
  price: z.number().min(0, 'El precio debe ser mayor a 0'),
  comparePrice: z.number().optional(),
  sku: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
  isDigital: z.boolean().default(true),
  stock: z.number().optional(),
  categoryId: z.string().optional(),
  courseId: z.string().optional(),
  pricingType: z.enum(['SINGLE_PRICE', 'MULTIPLE_PLANS']).default('SINGLE_PRICE'),
  paymentType: z.enum(['ONE_TIME', 'RECURRING']).default('ONE_TIME'),
  publishedAt: z.date().optional().nullable(),
  expiresAt: z.date().optional().nullable(),
})

type ProductFormData = z.infer<typeof productSchema>

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  shortDesc: string | null
  price: number
  comparePrice: number | null
  sku: string | null
  image: string | null
  images: string[]
  isActive: boolean
  isDigital: boolean
  stock: number | null
  categoryId: string | null
  pricingType?: 'SINGLE_PRICE' | 'MULTIPLE_PLANS'
  paymentType?: 'ONE_TIME' | 'RECURRING'
  createdAt: Date
  updatedAt: Date
  category: {
    id: string
    name: string
  } | null
  _count: {
    invoiceItems: number
  }
  publishedAt?: Date | null
  expiresAt?: Date | null
}

interface EditProductDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProductDialog({ product, open, onOpenChange }: EditProductDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [courses, setCourses] = useState<Array<{ id: string; title: string; isSynchronous: boolean }>>([])

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      shortDesc: product.shortDesc || '',
      price: product.price,
      comparePrice: product.comparePrice || undefined,
      sku: product.sku || '',
      image: product.image || '',
      isActive: product.isActive,
      isDigital: product.isDigital,
      stock: product.stock || undefined,
      categoryId: product.categoryId || '',
      pricingType: product.pricingType || 'SINGLE_PRICE',
      paymentType: product.paymentType || 'ONE_TIME',
      publishedAt: product.publishedAt || null,
      expiresAt: product.expiresAt || null,
    },
  })

  useEffect(() => {
    const loadData = async () => {
      const cats = await getCategories()
      setCategories(cats)

      const coursesData = await getCoursesForProducts()
      setCourses(coursesData.map(c => ({ id: c.id, title: c.title, isSynchronous: c.isSynchronous })))
    }
    loadData()
  }, [])

  useEffect(() => {
    form.reset({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      shortDesc: product.shortDesc || '',
      price: product.price,
      comparePrice: product.comparePrice || undefined,
      sku: product.sku || '',
      image: product.image || '',
      isActive: product.isActive,
      isDigital: product.isDigital,
      stock: product.stock || undefined,
      categoryId: product.categoryId || '',
      courseId: (product as { courseId?: string }).courseId || '',
      pricingType: product.pricingType || 'SINGLE_PRICE',
      paymentType: product.paymentType || 'ONE_TIME',
      publishedAt: product.publishedAt || null,
      expiresAt: product.expiresAt || null,
    })
  }, [product, form])

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true)
    try {
      const result = await updateProduct(product.id, {
        ...data,
        images: data.image ? [data.image] : [],
        categoryId: data.categoryId === 'no-category' ? null : data.categoryId || null,
        courseId: data.courseId === 'no-course' ? null : data.courseId || null,
        comparePrice: data.comparePrice || null,
        sku: data.sku || null,
        stock: data.isDigital ? null : data.stock || 0,
        pricingType: data.pricingType,
        paymentType: data.paymentType,
        publishedAt: data.publishedAt || null,
        expiresAt: data.expiresAt || null,
      })
      if (result.success) {
        toast.success('Producto actualizado correctamente')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al actualizar el producto')
      }
    } catch {
      toast.error('Error inesperado al actualizar el producto')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
          <DialogDescription>Modifica los datos del producto.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del producto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="slug-del-producto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="shortDesc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción Corta</FormLabel>
                  <FormControl>
                    <Input placeholder="Descripción breve del producto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción detallada del producto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comparePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de Comparación</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00 (opcional)"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="SKU del producto (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-category">Sin categoría</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => {
                const selectedCourse = courses.find(c => c.id === field.value)
                const isSynchronousCourse = selectedCourse?.isSynchronous ?? false

                return (
                  <FormItem>
                    <FormLabel>Curso Asociado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar curso (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-course">Sin curso asociado</SelectItem>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title} {course.isSynchronous ? '🔴 Sincrónico' : '🟢 Asíncrono'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isSynchronousCourse && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                        <span>⚠️</span>
                        <span>
                          Este producto <strong>requiere selección de horario</strong> porque está asociado a un curso sincrónico.
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Al comprar este producto, el usuario será enrolado en el curso seleccionado
                    </div>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen del Producto</FormLabel>
                  <div className="space-y-2">
                    <ImageSelector
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormControl>
                      <Input
                        placeholder="O ingresa una URL personalizada (opcional)"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isDigital"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Producto Digital</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        No requiere inventario físico
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Estado Activo</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        El producto estará visible en la tienda
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {!form.watch('isDigital') && (
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="publishedAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Publicar desde</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      Dejar vacío para publicar inmediatamente
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expira el</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      Dejar vacío para que no expire
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Product Type Configuration */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-medium">Configuración del Producto</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Precio</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SINGLE_PRICE">Precio Único</SelectItem>
                          <SelectItem value="MULTIPLE_PLANS">Múltiples Planes</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        {field.value === 'SINGLE_PRICE'
                          ? 'Producto con un solo precio (ej: franela, gorra)'
                          : 'Producto con distintos planes de pago (ej: programa regular con planes simple, regular, intensivo)'}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pago</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ONE_TIME">Pago Único</SelectItem>
                          <SelectItem value="RECURRING">Pago Recurrente</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        {field.value === 'ONE_TIME'
                          ? 'Pago único (ej: merchandising, curso asíncrono)'
                          : 'Pago recurrente/suscripción (ej: programa regular de inglés)'}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
