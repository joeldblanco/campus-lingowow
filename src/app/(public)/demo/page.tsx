'use client'

import Footer from '@/components/public-components/footer'
import Header from '@/components/public-components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Video, Calendar, Users, Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'

const DemoSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Por favor ingresa un email válido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  language: z.string().min(1, 'Por favor selecciona un idioma'),
  level: z.string().min(1, 'Por favor selecciona tu nivel'),
  preferredDate: z.string().min(1, 'Por favor selecciona una fecha preferida'),
  preferredTime: z.string().min(1, 'Por favor selecciona un horario preferido'),
  comments: z.string().optional(),
})

type DemoFormData = z.infer<typeof DemoSchema>

const Demo = () => {
  const form = useForm<DemoFormData>({
    resolver: zodResolver(DemoSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      language: '',
      level: '',
      preferredDate: '',
      preferredTime: '',
      comments: '',
    },
  })

  const onSubmit = async (values: DemoFormData) => {
    try {
      console.log('Demo class request:', values)
      toast.success('¡Solicitud enviada exitosamente! Te contactaremos pronto para confirmar tu clase de prueba.')
      form.reset()
    } catch (error) {
      console.error('Error submitting demo request:', error)
      toast.error('Error al enviar la solicitud')
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
                Clase de Prueba Gratuita
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Prueba Nuestro Método Sin Compromiso
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                Experimenta una clase real con uno de nuestros profesores expertos. 
                Descubre cómo podemos ayudarte a alcanzar tus objetivos de aprendizaje.
              </p>
            </div>
          </div>
        </section>

        {/* Beneficios de la Clase Demo */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                ¿Qué Incluye la Clase de Prueba?
              </h2>
              <p className="text-muted-foreground max-w-[700px] mx-auto">
                Una sesión completa de 45 minutos diseñada para conocer tu nivel y objetivos.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Video className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Clase en Vivo</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Sesión individual por videollamada con un profesor experto.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Evaluación de Nivel</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Determinamos tu nivel actual y áreas de mejora.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Plan Personalizado</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Recomendaciones específicas para tu aprendizaje.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Sin Compromiso</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    100% gratuita, sin obligación de inscripción.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Formulario de Solicitud */}
        <section className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Solicita Tu Clase de Prueba</CardTitle>
                  <CardDescription>
                    Completa el formulario y te contactaremos en menos de 24 horas para coordinar tu clase.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre Completo</FormLabel>
                              <FormControl>
                                <Input placeholder="Tu nombre" {...field} />
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
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+51 902 518 947" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Idioma de Interés</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un idioma" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="english">Inglés</SelectItem>
                                  <SelectItem value="spanish">Español</SelectItem>
                                  <SelectItem value="french">Francés</SelectItem>
                                  <SelectItem value="german">Alemán</SelectItem>
                                  <SelectItem value="italian">Italiano</SelectItem>
                                  <SelectItem value="portuguese">Portugués</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nivel Actual (Aproximado)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona tu nivel" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="beginner">Principiante (A1-A2)</SelectItem>
                                <SelectItem value="intermediate">Intermedio (B1-B2)</SelectItem>
                                <SelectItem value="advanced">Avanzado (C1-C2)</SelectItem>
                                <SelectItem value="unknown">No estoy seguro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="preferredDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha Preferida</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="preferredTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horario Preferido</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona horario" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="morning">Mañana (8:00 - 12:00)</SelectItem>
                                  <SelectItem value="afternoon">Tarde (12:00 - 18:00)</SelectItem>
                                  <SelectItem value="evening">Noche (18:00 - 22:00)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="comments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comentarios Adicionales (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Cuéntanos sobre tus objetivos de aprendizaje..."
                                className="resize-none"
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Enviando...' : 'Solicitar Clase Gratuita'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonios Rápidos */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Lo Que Dicen Nuestros Estudiantes
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="font-semibold">Cristian Villamizar</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    &quot;La clase de prueba me convenció completamente. El profesor fue excelente y el método realmente funciona.&quot;
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="font-semibold">Mari Carmen Rico</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    &quot;Desde la primera clase noté la diferencia. Atención personalizada y profesores titulados.&quot;
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="font-semibold">Mariana Hernandez</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    &quot;El sistema es dinámico y entretenido. Tener un profesor que conoce tus objetivos es invaluable.&quot;
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="w-full py-12 md:py-16 bg-gradient-to-r from-indigo-100 to-blue-100">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center gap-6">
              <h2 className="text-3xl font-bold tracking-tight">
                ¿Tienes Preguntas?
              </h2>
              <p className="text-muted-foreground max-w-[600px]">
                Visita nuestra sección de preguntas frecuentes o contáctanos directamente.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/faq">
                  <Button size="lg" variant="outline">Preguntas Frecuentes</Button>
                </Link>
                <Link href="/contacto">
                  <Button size="lg">Contactar</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Demo
