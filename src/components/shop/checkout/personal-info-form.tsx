'use client'

import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useShopStore } from '@/stores/useShopStore'
import { CustomerInfo } from '@/types/shop'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { z } from 'zod'

interface PersonalInfoFormProps {
  onSubmit: () => void
}

// Tipo base para el formulario que incluye todos los campos posibles
interface PersonalInfoFormData extends CustomerInfo {
  additionalInfo?: string
}

export function PersonalInfoForm({ onSubmit }: PersonalInfoFormProps) {
  const { data: session } = useSession()
  const hasMerchandise = useShopStore((state) => state.getHasMerchandise())

  // Estado para controlar si se necesita envío para productos físicos
  const [needsShipping, setNeedsShipping] = useState(false)

  // Esquema base para todos los tipos de pedidos
  const baseSchema = {
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    email: z.string().email('El correo electrónico no es válido'),
    phone: z.string().min(9, 'El teléfono debe tener al menos 9 dígitos'),
    additionalInfo: z.string().optional(),
  }

  // Esquema completo con campos de dirección
  const fullSchema = {
    ...baseSchema,
    address: z.string().min(10, 'La dirección debe tener al menos 10 caracteres'),
    city: z.string().min(2, 'La ciudad debe tener al menos 2 caracteres'),
    postalCode: z.string().min(5, 'El código postal debe tener al menos 5 caracteres'),
    country: z.string().min(2, 'El país debe tener al menos 2 caracteres'),
  }

  // Determinamos qué esquema usar basado en si hay productos físicos y se necesita envío
  const personalInfoSchema = z.object(hasMerchandise && needsShipping ? fullSchema : baseSchema)

  const [formData, setFormData] = useState<PersonalInfoFormData>({
    firstName: session?.user?.name?.split(' ')[0] || '',
    lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
    email: session?.user?.email || '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    additionalInfo: '',
    needsShipping: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))

    // Limpiar el error para este campo cuando el usuario escribe
    if (errors[name]) {
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    try {
      personalInfoSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      // Guardamos los datos del cliente en sessionStorage
      sessionStorage.setItem(
        'customer-info',
        JSON.stringify({
          ...formData,
          needsShipping,
          fullName: `${formData.firstName} ${formData.lastName}`,
        })
      )

      onSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardTitle className="mb-4">Información Personal</CardTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellidos</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo Electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
        </div>
      </div>

      {/* Mostrar opción de envío solo si hay productos físicos */}
      {hasMerchandise && (
        <>
          <Separator className="my-4" />

          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="needsShipping"
                checked={needsShipping}
                onCheckedChange={(checked) => setNeedsShipping(checked === true)}
              />
              <Label htmlFor="needsShipping">Necesito envío a domicilio</Label>
            </div>
          </div>
        </>
      )}

      {/* Campos de dirección condicionales */}
      {hasMerchandise && needsShipping && (
        <>
          <div className="space-y-2 mb-4">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={errors.address ? 'border-red-500' : ''}
            />
            {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Código Postal</Label>
              <Input
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className={errors.postalCode ? 'border-red-500' : ''}
              />
              {errors.postalCode && <p className="text-red-500 text-sm">{errors.postalCode}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className={errors.country ? 'border-red-500' : ''}
              />
              {errors.country && <p className="text-red-500 text-sm">{errors.country}</p>}
            </div>
          </div>
        </>
      )}

      <div className="space-y-2 mb-6">
        <Label htmlFor="additionalInfo">Información Adicional (opcional)</Label>
        <Textarea
          id="additionalInfo"
          name="additionalInfo"
          value={formData.additionalInfo}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full">
        Continuar al Pago
      </Button>
    </form>
  )
}
