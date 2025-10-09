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
    resolver: zodResolver(createPersonalInfoSchema(needsShipping)),
    defaultValues: {
      firstName: session?.user?.name?.split(' ')[0] || '',
      lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
      email: session?.user?.email || '',
      phone: '',
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
      <form onSubmit={form.handleSubmit(onFormSubmit)}>
        <CardTitle className="mb-4">Información Personal</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Input {...field} />
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
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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

        {/* Campos de dirección condicionales */}
        {hasMerchandise && needsShipping && (
          <>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        <Button type="submit" className="w-full">
          Continuar al Pago
        </Button>
      </form>
    </Form>
  )
}
