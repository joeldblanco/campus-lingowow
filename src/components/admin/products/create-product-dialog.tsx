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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createProduct, createProductWithMixedPlans, getCategories } from '@/lib/actions/commercial'
import { getCoursesForProducts } from '@/lib/actions/courses'
import { toast } from 'sonner'
import { Category } from '@/types/category'
import { EnhancedPlanManager, PlanData } from './enhanced-plan-manager'
import { FileUpload } from '@/components/ui/file-upload'
import Image from 'next/image'

interface Course {
  id: string
  title: string
  description: string
  level: string
  language: string
  classDuration: number
  isSynchronous: boolean
}

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido'),
  description: z.string().optional(),
  shortDesc: z.string().optional(),
  price: z.number().min(0, 'El precio debe ser mayor a 0'),
  comparePrice: z.number().optional(),
  sku: z.string().optional(),
  image: z.string().optional(),
  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isDigital: z.boolean().default(true),
  stock: z.number().optional(),
  categoryId: z.string().optional(),
  requiresScheduling: z.boolean().default(false),
  courseId: z.string().optional(),
  maxScheduleSlots: z.number().min(1).optional(),
  scheduleDuration: z.number().min(15).optional(),
  pricingType: z.enum(['SINGLE_PRICE', 'MULTIPLE_PLANS']).default('SINGLE_PRICE'),
  paymentType: z.enum(['ONE_TIME', 'RECURRING']).default('ONE_TIME'),
  creditPrice: z.number().optional(),
  acceptsCredits: z.boolean().default(false),
  acceptsRealMoney: z.boolean().default(true),
  publishedAt: z.date().optional().nullable(),
  expiresAt: z.date().optional().nullable(),
})

type ProductFormData = z.infer<typeof productSchema>

interface CreateProductDialogProps {
  children: React.ReactNode
}

export function CreateProductDialog({ children }: CreateProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [plans, setPlans] = useState<PlanData[]>([])

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      shortDesc: '',
      price: 0,
      comparePrice: undefined,
      sku: '',
      image: '',
      images: [],
      isActive: true,
      isDigital: true,
      stock: undefined,
      categoryId: undefined,
      requiresScheduling: false,
      courseId: undefined,
      maxScheduleSlots: 1,
      scheduleDuration: 60,
      pricingType: 'SINGLE_PRICE',
      paymentType: 'ONE_TIME',
      creditPrice: undefined,
      acceptsCredits: false,
      acceptsRealMoney: true,
      publishedAt: null,
      expiresAt: null,
    },
  })

  useEffect(() => {
    const loadData = async () => {
      const [cats, coursesData] = await Promise.all([getCategories(), getCoursesForProducts()])
      setCategories(cats)
      setCourses(coursesData)
    }
    loadData()
  }, [])

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true)
    try {
      const productData = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        shortDesc: data.shortDesc || null,
        price: data.price,
        comparePrice: data.comparePrice || null,
        sku: data.sku || null,
        image: data.image || null,
        images: data.images,
        isActive: data.isActive,
        isDigital: data.isDigital,
        stock: data.stock || null,
        categoryId: data.categoryId || null,
        requiresScheduling: data.requiresScheduling,
        courseId: data.courseId || null,
        maxScheduleSlots: data.maxScheduleSlots || null,
        scheduleDuration: data.scheduleDuration || null,
        pricingType: data.pricingType,
        paymentType: data.paymentType,
        tags: [],
        creditPrice: data.creditPrice || null,
        acceptsCredits: data.acceptsCredits,
        acceptsRealMoney: data.acceptsRealMoney,
        sortOrder: 0,
        publishedAt: data.publishedAt || null,
        expiresAt: data.expiresAt || null,
      }

      // Validar que si es MULTIPLE_PLANS, debe tener al menos un plan
      if (data.pricingType === 'MULTIPLE_PLANS' && plans.length === 0) {
        toast.error('Debes agregar al menos un plan para productos con múltiples planes')
        return
      }

      let result

      if (data.pricingType === 'MULTIPLE_PLANS' && plans.length > 0) {
        // Separar planes nuevos de planes existentes
        const newPlans = plans.filter(plan => !plan.isExisting).map(plan => ({
          name: plan.name,
          slug: plan.slug,
          description: plan.description || undefined,
          price: plan.price,
          comparePrice: plan.comparePrice || undefined,
          duration: plan.duration,
          isActive: plan.isActive,
          isPopular: plan.isPopular,
          sortOrder: plan.sortOrder,
          includesClasses: plan.includesClasses || false,
          classesPerPeriod: plan.classesPerPeriod || undefined,
          classesPerWeek: plan.classesPerWeek || undefined,
          allowProration: plan.allowProration ?? true,
          autoRenewal: plan.autoRenewal ?? true,
          billingCycle: plan.billingCycle || undefined,
          creditPrice: plan.creditPrice || undefined,
          acceptsCredits: plan.acceptsCredits ?? false,
          acceptsRealMoney: plan.acceptsRealMoney ?? true,
        }))

        const existingPlanIds = plans
          .filter(plan => plan.isExisting && plan.id)
          .map(plan => plan.id!)

        result = await createProductWithMixedPlans(productData, newPlans, existingPlanIds)
      } else {
        result = await createProduct(productData)
      }

      if (result.success) {
        toast.success('Producto creado correctamente')
        form.reset()
        setPlans([])
        setOpen(false)
      } else {
        toast.error(result.error || 'Error al crear el producto')
      }
    } catch {
      toast.error('Error inesperado al crear el producto')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    form.setValue('slug', slug)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
          <DialogDescription>Crea un nuevo producto para la tienda.</DialogDescription>
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
                      <Input
                        placeholder="Nombre del producto"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          handleNameChange(e.target.value)
                        }}
                      />
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
                    <FormLabel>Precio {form.watch('pricingType') === 'MULTIPLE_PLANS' && '(Referencial)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={form.watch('pricingType') === 'MULTIPLE_PLANS'}
                      />
                    </FormControl>
                    {form.watch('pricingType') === 'MULTIPLE_PLANS' && (
                      <div className="text-xs text-muted-foreground">
                        El precio se define en cada plan
                      </div>
                    )}
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
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
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
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen principal</FormLabel>
                  <FormControl>
                    <FileUpload
                      fileType="image"
                      folder="products"
                      onUploadComplete={(result) => {
                        field.onChange(result.secure_url)
                      }}
                      onUploadError={(error) => {
                        console.error('Upload error:', error)
                      }}
                      className="mb-4"
                    />
                  </FormControl>
                  {field.value && (
                    <div className="mt-2">
                      <Image
                        src={field.value}
                        alt="Vista previa"
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded border"
                      />
                    </div>
                  )}
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

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => {
                  const selectedCourse = courses.find(c => c.id === field.value)
                  const isSynchronousCourse = selectedCourse?.isSynchronous ?? false

                  return (
                    <FormItem>
                      <FormLabel>Curso asociado</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          if (value === 'none') {
                            field.onChange(undefined)
                            form.setValue('requiresScheduling', false)
                          } else {
                            field.onChange(value)
                            const course = courses.find(c => c.id === value)
                            if (course) {
                              form.setValue('scheduleDuration', course.classDuration)
                              // Inferir requiresScheduling del tipo de curso
                              form.setValue('requiresScheduling', course.isSynchronous)
                            }
                          }
                        }}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar curso (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses.length === 0 ? (
                            <SelectItem value="no-courses" disabled>
                              No hay cursos publicados
                            </SelectItem>
                          ) : (
                            <>
                              <SelectItem value="none">Sin curso asociado</SelectItem>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.title} ({course.level}) {course.isSynchronous ? '🔴 Sincrónico' : '🟢 Asíncrono'}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      {isSynchronousCourse && (
                        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                          <span>⚠️</span>
                          <span>
                            Este producto <strong>requerirá selección de horario</strong> porque está asociado a un curso sincrónico.
                          </span>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              {form.watch('requiresScheduling') && (
                <>

                  <div className={`grid gap-4 ${form.watch('pricingType') === 'SINGLE_PRICE' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {form.watch('pricingType') === 'SINGLE_PRICE' && (
                      <FormField
                        control={form.control}
                        name="maxScheduleSlots"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Máximo de horarios</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground">
                              Número máximo de horarios que un usuario puede reservar para este producto
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="scheduleDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duración (minutos)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="15"
                              step="15"
                              placeholder="60"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                              disabled={!!form.watch('courseId')}
                            />
                          </FormControl>
                          <div className="text-xs text-muted-foreground">
                            {form.watch('courseId')
                              ? 'Determinado automáticamente por el curso seleccionado'
                              : 'Duración en minutos de cada sesión programada (ej: 60 para 1 hora)'
                            }
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
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

            {/* Plan Management Section */}
            {form.watch('pricingType') === 'MULTIPLE_PLANS' && (
              <div className="border-t pt-6">
                <EnhancedPlanManager
                  plans={plans}
                  onPlansChange={setPlans}
                  className="mb-6"
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creando...' : 'Crear Producto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
