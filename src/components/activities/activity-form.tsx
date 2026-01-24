'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { createActivity, updateActivity } from '@/lib/actions/activity'
import { activityFormSchema } from '@/schemas/activity'
import { ActivityStep, ActivityWithContent } from '@/types/activity'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActivityType } from '@prisma/client'
import {
  ArrowLeft,
  BookOpen,
  Headphones,
  Mic,
  PenTool,
  PlusCircle,
  Save,
  Trash2,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

type ActivityFormValues = z.infer<typeof activityFormSchema>

interface ActivityFormProps {
  activity?: ActivityWithContent
}

export function ActivityForm({ activity }: ActivityFormProps = {}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!activity

  // Preparar valores por defecto
  const getDefaultSteps = (): ActivityStep[] => {
    if (activity && activity.steps) {
      return (activity.steps as ActivityStep[]) || []
    }
    return [
      {
        type: 'instruction',
        content: 'En esta actividad aprenderás...',
      },
    ]
  }

  // Inicializar formulario
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: activity?.title || '',
      description: activity?.description || '',
      type: (activity?.activityType as ActivityType) || 'READING',
      level: activity?.level || 1,
      points: activity?.points || 10,
      duration: activity?.duration || 5,
      isPublished: activity?.isPublished || false,
      createdBy: activity?.createdById,
      content: {
        steps: getDefaultSteps(),
      },
    },
  })

  // Configurar field array para los pasos de la actividad
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'content.steps',
  })

  // Manejar envío del formulario
  const onSubmit = async (data: ActivityFormValues) => {
    setIsSubmitting(true)

    if (!session?.user?.id) {
      toast.error('Debes iniciar sesión para crear una actividad.')
      setIsSubmitting(false)
      return
    }

    const finalData = {
      ...data,
      createdBy: session.user.id, // Usar el ID del usuario, no el nombre
    }

    try {
      if (isEditing && activity) {
        await updateActivity(activity.id, finalData)
        toast.success('Actividad actualizada correctamente.')
      } else {
        await createActivity(finalData)
        toast.success('Actividad creada correctamente.')
      }

      router.push('/admin/activities')
    } catch (error) {
      console.error('Error al guardar la actividad:', error)
      toast.error('Ocurrió un error al guardar la actividad.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para añadir un nuevo paso según el tipo
  const addStep = (type: string) => {
    switch (type) {
      case 'instruction':
        append({
          type: 'instruction',
          content: 'En esta actividad aprenderás...',
        })
        break
      case 'question':
        append({
          type: 'question',
          content: '¿Pregunta de ejemplo?',
          options: ['Opción 1', 'Opción 2', 'Opción 3', 'Opción 4'],
          correctAnswer: 0,
          hint: 'Pista para responder la pregunta.',
        })
        break
      case 'audio':
        append({
          type: 'audio',
          content: 'Escucha el siguiente audio:',
          audioUrl: '',
          transcript: 'Transcripción del audio aquí...',
        })
        break
      case 'recording':
        append({
          type: 'recording',
          content: 'Graba tu respuesta:',
          expectedTranscript: 'Texto esperado para comparar',
        })
        break
      case 'completion':
        append({
          type: 'completion',
          content: '¡Felicidades! Has completado esta actividad.',
        })
        break
    }
  }

  // Función para renderizar los campos según el tipo de paso
  const renderStepFields = (index: number, type: string) => {
    switch (type) {
      case 'question':
        return (
          <>
            <FormField
              control={form.control}
              name={`content.steps.${index}.options`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opciones</FormLabel>
                  <div className="space-y-2">
                    {field.value?.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(field.value || [])]
                            newOptions[optionIndex] = e.target.value
                            field.onChange(newOptions)
                          }}
                          placeholder={`Opción ${optionIndex + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newOptions = [...(field.value || [])]
                            newOptions.splice(optionIndex, 1)
                            field.onChange(newOptions)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        field.onChange([...(field.value || []), ''])
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Añadir opción
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`content.steps.${index}.correctAnswer`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Respuesta correcta</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString() || '0'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona la respuesta correcta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {form.watch(`content.steps.${index}.options`)?.map((option, optionIndex) => (
                        <SelectItem key={optionIndex} value={optionIndex.toString()}>
                          Opción {optionIndex + 1}: {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`content.steps.${index}.hint`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pista</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Pista para ayudar al estudiante" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case 'audio':
        return (
          <>
            <FormField
              control={form.control}
              name={`content.steps.${index}.audioUrl`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del audio</FormLabel>
                  <FormControl>
                    <Input placeholder="URL del archivo de audio" {...field} />
                  </FormControl>
                  <FormDescription>
                    Sube el archivo de audio a tu servidor y pega la URL aquí
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`content.steps.${index}.transcript`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transcripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Transcripción del audio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case 'recording':
        return (
          <FormField
            control={form.control}
            name={`content.steps.${index}.expectedTranscript`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transcripción esperada</FormLabel>
                <FormControl>
                  <Textarea placeholder="Transcripción esperada para comparar" {...field} />
                </FormControl>
                <FormDescription>
                  Este texto se usará para comparar con la grabación del estudiante (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      default:
        return null
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, () => {
          setIsSubmitting(false)
        })}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Ingresa la información básica de la actividad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Título de la actividad" {...field} />
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
                      <Textarea placeholder="Descripción de la actividad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
              <CardDescription>Configura los detalles de la actividad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="READING">Lectura</SelectItem>
                        <SelectItem value="LISTENING">Escucha</SelectItem>
                        <SelectItem value="SPEAKING">Habla</SelectItem>
                        <SelectItem value="WRITING">Escritura</SelectItem>
                        <SelectItem value="VOCABULARY">Vocabulario</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puntos XP</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Publicar actividad</FormLabel>
                      <FormDescription>
                        Esta actividad estará disponible para ser asignada a estudiantes
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pasos de la Actividad</CardTitle>
            <CardDescription>Configura los pasos que componen esta actividad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6">
              <Button type="button" variant="outline" onClick={() => addStep('instruction')}>
                <BookOpen className="h-4 w-4 mr-2" />
                Instrucción
              </Button>
              <Button type="button" variant="outline" onClick={() => addStep('question')}>
                <PenTool className="h-4 w-4 mr-2" />
                Pregunta
              </Button>
              <Button type="button" variant="outline" onClick={() => addStep('audio')}>
                <Headphones className="h-4 w-4 mr-2" />
                Audio
              </Button>
              <Button type="button" variant="outline" onClick={() => addStep('recording')}>
                <Mic className="h-4 w-4 mr-2" />
                Grabación
              </Button>
              <Button type="button" variant="outline" onClick={() => addStep('completion')}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Completado
              </Button>
            </div>

            <Accordion type="multiple" className="w-full">
              {fields.map((field, index) => (
                <AccordionItem key={field.id} value={`step-${index}`}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <span>
                        Paso {index + 1}: {field.type === 'instruction' && 'Instrucción'}
                        {field.type === 'question' && 'Pregunta'}
                        {field.type === 'audio' && 'Audio'}
                        {field.type === 'recording' && 'Grabación'}
                        {field.type === 'completion' && 'Completado'}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 p-4 border rounded-md">
                      <div className="flex justify-between items-center">
                        <FormField
                          control={form.control}
                          name={`content.steps.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Tipo de paso" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="instruction">Instrucción</SelectItem>
                                  <SelectItem value="question">Pregunta</SelectItem>
                                  <SelectItem value="audio">Audio</SelectItem>
                                  <SelectItem value="recording">Grabación</SelectItem>
                                  <SelectItem value="completion">Completado</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>

                      <Separator />

                      <FormField
                        control={form.control}
                        name={`content.steps.${index}.content`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contenido</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Contenido del paso" {...field} rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {renderStepFields(index, form.watch(`content.steps.${index}.type`))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {fields.length === 0 && (
              <div className="flex flex-col items-center justify-center border border-dashed rounded-md p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No hay pasos añadidos. Usa los botones de arriba para añadir pasos a tu actividad.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/activities')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'} Actividad
          </Button>
        </div>
      </form>
    </Form>
  )
}
