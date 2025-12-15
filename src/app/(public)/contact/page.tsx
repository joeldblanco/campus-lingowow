'use client'

import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CountryCodeSelect } from '@/components/ui/country-code-select'
import { Badge } from '@/components/ui/badge'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'

const ContactSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Por favor ingresa un email válido'),
  countryCode: z.string().min(1, 'El código de país es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  subject: z.string().min(1, 'Por favor selecciona un asunto'),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

type ContactFormData = z.infer<typeof ContactSchema>

export default function ContactoPage() {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      name: '',
      email: '',
      countryCode: '+51',
      phone: '',
      subject: '',
      message: '',
    },
  })

  const onSubmit = async (values: ContactFormData) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el mensaje')
      }
      
      toast.success('¡Mensaje enviado exitosamente! Te contactaremos pronto.')
      form.reset()
    } catch (error) {
      console.error('Error submitting contact form:', error)
      toast.error(error instanceof Error ? error.message : 'Error al enviar el mensaje')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center gap-4">
              <Badge variant="outline" className="w-fit">
                Estamos Aquí para Ayudarte
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Contáctanos
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                ¿Tienes preguntas sobre nuestros cursos? ¿Necesitas más información? 
                Estamos aquí para ayudarte. Contáctanos y te responderemos lo antes posible.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contact Information */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Información de Contacto</h2>
                  <p className="text-muted-foreground mb-6">
                    Puedes contactarnos a través de cualquiera de estos medios. 
                    Respondemos en menos de 24 horas.
                  </p>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h3 className="font-semibold mb-1">Teléfono</h3>
                          <p className="text-sm text-muted-foreground">+51 902 518 947</p>
                          <p className="text-xs text-muted-foreground mt-1">Lun - Vie: 9:00 AM - 6:00 PM</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h3 className="font-semibold mb-1">Email</h3>
                          <p className="text-sm text-muted-foreground">info@lingowow.com</p>
                          <p className="text-xs text-muted-foreground mt-1">Respuesta en 24h</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h3 className="font-semibold mb-1">Ubicación</h3>
                          <p className="text-sm text-muted-foreground">Callao, Perú</p>
                          <p className="text-xs text-muted-foreground mt-1">Clases 100% online</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h3 className="font-semibold mb-1">Horario de Atención</h3>
                          <p className="text-sm text-muted-foreground">Lunes a Viernes</p>
                          <p className="text-sm text-muted-foreground">9:00 AM - 6:00 PM (GMT-5)</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">¿Prefieres WhatsApp?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Escríbenos directamente y te responderemos al instante.
                    </p>
                    <Button className="w-full" variant="outline" asChild>
                      <a 
                        href="https://wa.me/51902518947" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Abrir WhatsApp
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Envíanos un Mensaje</CardTitle>
                    <CardDescription>
                      Completa el formulario y nos pondremos en contacto contigo lo antes posible.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre Completo</FormLabel>
                                <FormControl>
                                  <Input placeholder="Juan Pérez" {...field} />
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
                                  <Input type="email" placeholder="juan@ejemplo.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            name="subject"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Asunto</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona un asunto" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="informacion">Información General</SelectItem>
                                    <SelectItem value="cursos">Consulta sobre Cursos</SelectItem>
                                    <SelectItem value="precios">Precios y Planes</SelectItem>
                                    <SelectItem value="clase-prueba">Clase de Prueba</SelectItem>
                                    <SelectItem value="soporte">Soporte Técnico</SelectItem>
                                    <SelectItem value="otro">Otro</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mensaje</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Cuéntanos en qué podemos ayudarte..."
                                  className="min-h-[150px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full" 
                          size="lg"
                          disabled={form.formState.isSubmitting}
                        >
                          {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Quick Links */}
        <section className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">¿Tienes Preguntas Frecuentes?</h2>
              <p className="text-muted-foreground">
                Tal vez encuentres la respuesta que buscas en nuestra sección de FAQ
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="/#faq">Ver Preguntas Frecuentes</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
