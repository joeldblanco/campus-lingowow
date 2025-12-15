'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CountryCodeSelect } from '@/components/ui/country-code-select'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'

// Schema para el formulario de contacto
const ContactSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Por favor ingresa un email válido'),
  countryCode: z.string().min(1, 'El código de país es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  language: z.string().min(1, 'Por favor selecciona un idioma'),
})

type ContactFormData = z.infer<typeof ContactSchema>

export function ContactForm() {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      name: '',
      email: '',
      countryCode: '+51',
      phone: '',
      language: '',
    },
  })

  const onSubmit = async (values: ContactFormData) => {
    try {
      const response = await fetch('/api/trial-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la solicitud')
      }
      
      toast.success('¡Solicitud enviada exitosamente! Te contactaremos pronto.')
      form.reset()
    } catch (error) {
      console.error('Error submitting contact form:', error)
      toast.error(error instanceof Error ? error.message : 'Error al enviar la solicitud')
    }
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Solicita tu clase de prueba gratuita</CardTitle>
        <CardDescription>Completa el formulario y te contactaremos en 24h</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre completo" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <CountryCodeSelect
                    value={form.watch('countryCode')}
                    onChange={(value) => form.setValue('countryCode', value)}
                    phoneValue={form.watch('phone')}
                    onPhoneChange={(value) => form.setValue('phone', value)}
                  />
                </FormControl>
                <FormMessage>
                  {form.formState.errors.countryCode?.message || form.formState.errors.phone?.message}
                </FormMessage>
              </FormItem>

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma de interés</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un idioma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="english">Inglés</SelectItem>
                        <SelectItem value="spanish">Español</SelectItem>
                        <SelectItem value="french" disabled>
                          Francés (Próximamente)
                        </SelectItem>
                        <SelectItem value="german" disabled>
                          Alemán (Próximamente)
                        </SelectItem>
                        <SelectItem value="italian" disabled>
                          Italiano (Próximamente)
                        </SelectItem>
                        <SelectItem value="portuguese" disabled>
                          Portugués (Próximamente)
                        </SelectItem>
                        <SelectItem value="chinese" disabled>
                          Chino Mandarín (Próximamente)
                        </SelectItem>
                        <SelectItem value="japanese" disabled>
                          Japonés (Próximamente)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enviando...' : 'Solicitar Clase Gratuita'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
