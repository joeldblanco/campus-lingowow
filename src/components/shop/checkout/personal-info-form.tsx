'use client'

import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useShopStore } from '@/stores/useShopStore'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { PersonalInfoSchema, createPersonalInfoSchema } from '@/schemas/checkout'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface PersonalInfoFormProps {
  onSubmit: () => void
}

type FormData = z.infer<typeof PersonalInfoSchema>

export function PersonalInfoForm({ onSubmit }: PersonalInfoFormProps) {
  const { data: session } = useSession()
  const hasMerchandise = useShopStore((state) => state.getHasMerchandise())

  // Estado para controlar si se necesita envío para productos físicos
  const [needsShipping, setNeedsShipping] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(createPersonalInfoSchema()),
    defaultValues: {
      firstName: session?.user?.name?.split(' ')[0] || '',
      lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
      email: session?.user?.email || '',
      country: '',
      city: '',
      address: '',
      zipCode: '',
    },
  })

  // Actualizar la validación cuando cambia needsShipping
  useEffect(() => {
    // Limpiar errores de campos de dirección cuando no se necesita envío
    if (!needsShipping) {
      form.clearErrors(['country', 'city', 'address', 'zipCode'])
    }
  }, [needsShipping, form])

  const onFormSubmit = (values: FormData) => {
    // Validar campos de dirección si se necesita envío
    if (hasMerchandise && needsShipping) {
      const errors: { field: 'country' | 'city' | 'address' | 'zipCode', message: string }[] = []
      
      if (!values.country || values.country.trim() === '') {
        errors.push({ field: 'country', message: 'El país es requerido' })
      }
      if (!values.city || values.city.trim() === '') {
        errors.push({ field: 'city', message: 'La ciudad es requerida' })
      }
      if (!values.address || values.address.trim() === '') {
        errors.push({ field: 'address', message: 'La dirección es requerida' })
      }
      if (!values.zipCode || values.zipCode.trim() === '') {
        errors.push({ field: 'zipCode', message: 'El código postal es requerido' })
      }

      if (errors.length > 0) {
        errors.forEach(({ field, message }) => {
          form.setError(field, { type: 'manual', message })
        })
        return
      }
    }

    // Guardamos los datos del cliente en sessionStorage
    sessionStorage.setItem(
      'customer-info',
      JSON.stringify({
        ...values,
        needsShipping,
        fullName: `${values.firstName} ${values.lastName}`,
      })
    )

    console.log(values)

    onSubmit()
  }

  return (
    <Form {...form}>
      <form id="personal-info-form" onSubmit={form.handleSubmit(onFormSubmit)}>
        <CardTitle className="mb-4">Información Personal</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Juan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellidos</FormLabel>
                <FormControl>
                  <Input placeholder="Pérez García" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="juan.perez@ejemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Billing Address - Always Required */}
        <div className="mb-6">
          <CardTitle className="mb-4">Dirección de Facturación</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <Input placeholder="España" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Madrid" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle Gran Vía 123, Piso 4, Puerta A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Postal</FormLabel>
                  <FormControl>
                    <Input placeholder="28013" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                <label htmlFor="needsShipping">Necesito envío a domicilio</label>
              </div>
            </div>
          </>
        )}

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
                <label htmlFor="needsShipping">Usar esta dirección para envío</label>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                La dirección de facturación se usará también para envío si seleccionas esta opción
              </p>
            </div>
          </>
        )}

        {/* Create Account Option for Guest Users */}
        {!session?.user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="createAccount"
                defaultChecked={true}
                onCheckedChange={(checked) => {
                  // Save preference for creating account after payment
                  sessionStorage.setItem('create-account-after-payment', checked.toString())
                }}
              />
              <div className="flex-1">
                <label htmlFor="createAccount" className="text-sm font-medium text-blue-800 cursor-pointer">
                  Crear cuenta después del pago
                </label>
                <p className="text-xs text-blue-600 mt-1">
                  Guarda tu información para futuras compras y accede a tu historial de cursos.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button type="submit" className="w-full">
          Continuar al Pago
        </Button>
      </form>
    </Form>
  )
}
