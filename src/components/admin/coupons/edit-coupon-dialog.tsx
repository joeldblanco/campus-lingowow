'use client'

import { useState, useEffect, useCallback } from 'react'
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
  FormDescription,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateCoupon, searchUsersForCoupon, getPlansForCoupon } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, X, User, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

const couponSchema = z.object({
  code: z.string().min(1, 'El código es requerido').toUpperCase(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.number().min(0, 'El valor debe ser mayor a 0'),
  minAmount: z.number().optional(),
  maxDiscount: z.number().optional(),
  usageLimit: z.number().optional(),
  userLimit: z.number().optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  restrictedToUserId: z.string().optional(),
  restrictedToPlanId: z.string().optional(),
})

type CouponFormData = z.infer<typeof couponSchema>

interface UserOption {
  id: string
  name: string
  lastName?: string | null
  email: string
}

interface PlanOption {
  id: string
  name: string
  slug: string
  price: number
  product: { name: string } | null
}

interface Coupon {
  id: string
  code: string
  name: string | null
  description: string | null
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  minAmount: number | null
  maxDiscount: number | null
  usageLimit: number | null
  usageCount: number
  userLimit: number | null
  isActive: boolean
  startsAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
  restrictedToUserId?: string | null
  restrictedToPlanId?: string | null
  restrictedUser?: { id: string; name: string; email: string } | null
  restrictedPlan?: { id: string; name: string; slug: string } | null
}

interface EditCouponDialogProps {
  coupon: Coupon
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCouponDialog({ coupon, open, onOpenChange }: EditCouponDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([])
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null)

  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      type: 'PERCENTAGE',
      value: 0,
      minAmount: undefined,
      maxDiscount: undefined,
      usageLimit: undefined,
      userLimit: undefined,
      isActive: true,
      startsAt: '',
      expiresAt: '',
      restrictedToUserId: undefined,
      restrictedToPlanId: undefined,
    },
  })

  useEffect(() => {
    if (open) {
      getPlansForCoupon().then(setPlanOptions)
    }
  }, [open])

  useEffect(() => {
    if (coupon) {
      form.reset({
        code: coupon.code,
        name: coupon.name || '',
        description: coupon.description || '',
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount || undefined,
        maxDiscount: coupon.maxDiscount || undefined,
        usageLimit: coupon.usageLimit || undefined,
        userLimit: coupon.userLimit || undefined,
        isActive: coupon.isActive,
        startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : '',
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '',
        restrictedToUserId: coupon.restrictedToUserId || undefined,
        restrictedToPlanId: coupon.restrictedToPlanId || undefined,
      })
      
      if (coupon.restrictedUser) {
        setSelectedUser(coupon.restrictedUser)
      } else {
        setSelectedUser(null)
      }
      
      if (coupon.restrictedPlan) {
        setSelectedPlan({
          id: coupon.restrictedPlan.id,
          name: coupon.restrictedPlan.name,
          slug: coupon.restrictedPlan.slug,
          price: 0,
          product: null,
        })
      } else {
        setSelectedPlan(null)
      }
    }
  }, [coupon, form])

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUserOptions([])
      return
    }
    setIsSearchingUsers(true)
    try {
      const users = await searchUsersForCoupon(query)
      setUserOptions(users)
    } catch {
      setUserOptions([])
    } finally {
      setIsSearchingUsers(false)
    }
  }, [])

  const onSubmit = async (data: CouponFormData) => {
    setIsLoading(true)
    try {
      const result = await updateCoupon(coupon.id, {
        ...data,
        name: data.name || null,
        description: data.description || null,
        minAmount: data.minAmount || null,
        maxDiscount: data.maxDiscount || null,
        usageLimit: data.usageLimit || null,
        userLimit: data.userLimit || null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        restrictedToUserId: data.restrictedToUserId || null,
        restrictedToPlanId: data.restrictedToPlanId || null,
      })
      if (result.success) {
        toast.success('Cupón actualizado correctamente')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al actualizar el cupón')
      }
    } catch {
      toast.error('Error inesperado al actualizar el cupón')
    } finally {
      setIsLoading(false)
    }
  }

  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    form.setValue('code', code)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cupón</DialogTitle>
          <DialogDescription>
            Modifica los detalles del cupón.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="DESCUENTO10"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <Button type="button" variant="outline" onClick={generateCode}>
                        Generar
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del cupón (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción del cupón (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Descuento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Porcentaje</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Cantidad Fija</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor {form.watch('type') === 'PERCENTAGE' ? '(%)' : '($)'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step={form.watch('type') === 'PERCENTAGE' ? '1' : '0.01'}
                        placeholder={form.watch('type') === 'PERCENTAGE' ? '10' : '5.00'}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                name="minAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Mínimo ($)</FormLabel>
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
              {form.watch('type') === 'PERCENTAGE' && (
                <FormField
                  control={form.control}
                  name="maxDiscount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descuento Máximo ($)</FormLabel>
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
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="usageLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Límite de Usos</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="Ilimitado (opcional)"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Límite por Usuario</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="Ilimitado (opcional)"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
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
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Vencimiento</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Estado Activo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      El cupón estará disponible para usar
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Restricciones (Opcional)
              </div>
              
              <FormField
                control={form.control}
                name="restrictedToUserId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Usuario Específico</FormLabel>
                    <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {selectedUser ? (
                              <span className="flex items-center gap-2">
                                <span>{selectedUser.name} {selectedUser.lastName || ''}</span>
                                <Badge variant="secondary" className="text-xs">{selectedUser.email}</Badge>
                              </span>
                            ) : (
                              "Buscar usuario..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nombre o email..."
                            value={userSearchQuery}
                            onValueChange={(value) => {
                              setUserSearchQuery(value)
                              searchUsers(value)
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {isSearchingUsers ? "Buscando..." : userSearchQuery.length < 2 ? "Escribe al menos 2 caracteres" : "No se encontraron usuarios"}
                            </CommandEmpty>
                            <CommandGroup>
                              {userOptions.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.id}
                                  onSelect={() => {
                                    setSelectedUser(user)
                                    field.onChange(user.id)
                                    setUserSearchOpen(false)
                                    setUserSearchQuery('')
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === user.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{user.name} {user.lastName || ''}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedUser && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-fit text-xs text-muted-foreground"
                        onClick={() => {
                          setSelectedUser(null)
                          field.onChange(undefined)
                        }}
                      >
                        <X className="h-3 w-3 mr-1" /> Quitar restricción de usuario
                      </Button>
                    )}
                    <FormDescription>
                      Si se selecciona, solo este usuario podrá usar el cupón
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="restrictedToPlanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Específico</FormLabel>
                    <div className="flex gap-2">
                      <Select
                        value={field.value || ''}
                        onValueChange={(value) => {
                          field.onChange(value || undefined)
                          const plan = planOptions.find(p => p.id === value)
                          setSelectedPlan(plan || null)
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar plan...">
                              {selectedPlan && (
                                <span className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  {selectedPlan.name}
                                  {selectedPlan.product && (
                                    <Badge variant="outline" className="text-xs">
                                      {selectedPlan.product.name}
                                    </Badge>
                                  )}
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {planOptions.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex items-center gap-2">
                                <span>{plan.name}</span>
                                {plan.product && (
                                  <Badge variant="outline" className="text-xs">
                                    {plan.product.name}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  ${plan.price}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedPlan && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPlan(null)
                            field.onChange(undefined)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      Si se selecciona, el cupón solo aplicará a este plan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">
                <strong>Estadísticas:</strong> Este cupón ha sido usado {coupon.usageCount} veces
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
