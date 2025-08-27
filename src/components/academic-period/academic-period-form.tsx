'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'
import React, { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SeasonDisplayNames, SeasonName } from '@/types/academic-period'
import { addWeeks } from 'date-fns'
import { getFirstMondayOfMonth } from '@/lib/utils/academic-period'
import { Season } from '@prisma/client'

// Definir el esquema de validación
const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  startDate: z.date({
    required_error: 'La fecha de inicio es obligatoria',
  }),
  seasonId: z.string({
    required_error: 'La temporada es obligatoria',
  }),
  isSpecialWeek: z.boolean().default(false),
  isActive: z.boolean().default(false),
})

interface AcademicPeriodFormProps {
  seasons: (Season & { name: SeasonName })[]
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>
  defaultMonth?: Date
  existingPeriods?: Array<{
    startDate: Date
    endDate: Date
  }>
}

const AcademicPeriodForm: React.FC<AcademicPeriodFormProps> = ({
  seasons,
  onSubmit,
  defaultMonth = new Date(),
  existingPeriods = [],
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inicializar el formulario
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      startDate: getFirstMondayOfMonth(defaultMonth.getFullYear(), defaultMonth.getMonth() + 1),
      seasonId: '',
      isSpecialWeek: false,
      isActive: false,
    },
  })

  // Obtener la fecha de inicio seleccionada
  const startDate = form.watch('startDate')
  const isSpecialWeek = form.watch('isSpecialWeek')
  const seasonId = form.watch('seasonId')

  // Calcular fecha de fin (siempre 4 semanas después de la fecha de inicio)
  const endDate = startDate ? addWeeks(startDate, isSpecialWeek ? 1 : 4) : undefined

  // Verificar si hay períodos superpuestos
  const hasOverlap = React.useMemo(() => {
    if (!startDate || !endDate) return false

    return existingPeriods.some(
      (period) =>
        (startDate >= period.startDate && startDate <= period.endDate) ||
        (endDate >= period.startDate && endDate <= period.endDate) ||
        (startDate <= period.startDate && endDate >= period.endDate)
    )
  }, [startDate, endDate, existingPeriods])

  // Manejar envío del formulario
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (hasOverlap) {
      toast.error('El período se superpone con otro existente')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(values)
      form.reset()
      toast.success('Período académico creado correctamente')
    } catch (error) {
      toast.error('Error al crear el período académico')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para deshabilitar fechas en el calendario
  const disabledDates = (date: Date) => {
    // Solo permitir lunes
    return date.getDay() !== 1
  }

  // Encontrar la temporada correspondiente a la fecha seleccionada
  const getSuggestedSeasonId = useCallback(() => {
    if (!startDate) return ''

    const matchingSeason = seasons.find(
      (season) => startDate >= new Date(season.startDate) && startDate <= new Date(season.endDate)
    )

    return matchingSeason?.id || ''
  }, [startDate, seasons])

  React.useEffect(() => {
    // Sugerir la temporada correspondiente cuando cambie la fecha
    const suggestedSeasonId = getSuggestedSeasonId()

    if (suggestedSeasonId && !seasonId) {
      form.setValue('seasonId', suggestedSeasonId)
    }

    // Generar nombre sugerido
    if (startDate) {
      const season = seasons.find((s) => s.id === seasonId)

      if (season) {
        const monthName = format(startDate, 'MMMM', { locale: es })
        const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1)

        const name = isSpecialWeek
          ? `${SeasonDisplayNames[season.name]} - Semana Especial (${capitalizedMonthName})`
          : `${SeasonDisplayNames[season.name]} - ${capitalizedMonthName}`

        form.setValue('name', name)
      }
    }
  }, [startDate, isSpecialWeek, seasonId, seasons, form, getSuggestedSeasonId])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Período Académico</CardTitle>
        <CardDescription>Configura un nuevo período para el calendario académico</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            id="academic-period-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Temporada Aurora - Enero" {...field} />
                  </FormControl>
                  <FormDescription>Nombre descriptivo para el período</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de inicio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`justify-start text-left font-normal ${
                              !field.value && 'text-muted-foreground'
                            }`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={disabledDates}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>Los períodos comienzan siempre en lunes</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col">
                <FormLabel>Fecha de fin</FormLabel>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal mt-1"
                  disabled
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, 'PPP', { locale: es })
                  ) : (
                    <span>Fecha calculada automáticamente</span>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {isSpecialWeek
                    ? 'Una semana después de la fecha de inicio'
                    : 'Cuatro semanas después de la fecha de inicio'}
                </p>

                {hasOverlap && (
                  <p className="text-sm text-destructive mt-1">
                    ¡Advertencia! Este período se superpone con otro existente.
                  </p>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="seasonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporada</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona la temporada" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {SeasonDisplayNames[season.name]} ({season.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Temporada a la que pertenece este período</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="isSpecialWeek"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Semana Especial</FormLabel>
                      <FormDescription>
                        Marcar como semana especial (duración de 1 semana en lugar de 4)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Período Activo</FormLabel>
                      <FormDescription>Establecer como el período activo actual</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => form.reset()}>
          Cancelar
        </Button>
        <Button type="submit" form="academic-period-form" disabled={isSubmitting || hasOverlap}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear Período
        </Button>
      </CardFooter>
    </Card>
  )
}

export default AcademicPeriodForm
