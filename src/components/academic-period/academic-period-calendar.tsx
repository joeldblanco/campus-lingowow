import CustomCalendar from '@/components/academic-period/custom-calendar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SeasonDisplayNames, SeasonName } from '@/types/academic-period'
import { AcademicPeriod, Season } from '@prisma/client'
import { format, isSameDay, isWithinInterval, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, Info } from 'lucide-react'
import React, { useCallback, useMemo } from 'react'

interface AcademicPeriodCalendarProps {
  periods: AcademicPeriod[]
  seasons: (Season & { name: SeasonName })[]
  selectedYear: number
  onYearChange: (year: number) => void
  onPeriodSelect?: (periodId: string) => void
}

const AcademicPeriodCalendar: React.FC<AcademicPeriodCalendarProps> = ({
  periods,
  seasons,
  selectedYear,
  onYearChange,
  onPeriodSelect,
}) => {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date())
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())

  // Procesamos las fechas para asegurarnos de que sean objetos Date
  const processedPeriods = periods.map((period) => ({
    ...period,
    startDate: typeof period.startDate === 'string' ? parseISO(period.startDate) : period.startDate,
    endDate: typeof period.endDate === 'string' ? parseISO(period.endDate) : period.endDate,
  }))

  const processedSeasons = seasons.map((season) => ({
    ...season,
    startDate: typeof season.startDate === 'string' ? parseISO(season.startDate) : season.startDate,
    endDate: typeof season.endDate === 'string' ? parseISO(season.endDate) : season.endDate,
  }))

  // Obtenemos los años disponibles
  const availableYears = Array.from(new Set(processedSeasons.map((season) => season.year))).sort(
    (a, b) => b - a
  ) // Ordenamos de más reciente a más antiguo

  // Función para obtener el período que contiene una fecha
  const getPeriodForDate = useCallback(
    (date: Date): AcademicPeriod | undefined => {
      return processedPeriods.find((period) =>
        isWithinInterval(date, {
          start: period.startDate,
          end: period.endDate,
        })
      )
    },
    [processedPeriods] // Solo se recreará cuando processedPeriods cambie
  )

  // Función para obtener la temporada que contiene una fecha
  const getSeasonForDate = (date: Date): Season | undefined => {
    return processedSeasons.find((season) =>
      isWithinInterval(date, {
        start: season.startDate,
        end: season.endDate,
      })
    )
  }

  // Función para manejar el cambio de mes en el calendario
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)

    // Si el año cambia, actualizamos el año seleccionado
    if (date.getFullYear() !== selectedYear) {
      onYearChange(date.getFullYear())
    }
  }

  // Creamos los modificadores para el calendario
  const modifiers = useMemo(() => {
    const mods: Record<string, (date: Date) => boolean> = {
      // Días de inicio de periodo
      periodStart: (date: Date) =>
        processedPeriods.some((period) => isSameDay(date, period.startDate)),

      // Periodos activos
      activePeriod: (date: Date) => {
        const period = getPeriodForDate(date)
        return !!period && period.isActive
      },

      // Periodos especiales
      specialPeriod: (date: Date) => {
        const period = getPeriodForDate(date)
        return !!period && period.isSpecialWeek
      },

      // Periodos normales (no activos, no especiales)
      normalPeriod: (date: Date) => {
        const period = getPeriodForDate(date)
        return !!period && !period.isActive && !period.isSpecialWeek
      },
    }

    return mods
  }, [processedPeriods, getPeriodForDate])

  // Filtramos los períodos por año seleccionado
  const filteredPeriods = processedPeriods.filter(
    (period) => period.startDate.getFullYear() === selectedYear
  )

  // Agrupamos los períodos por temporada
  const periodsBySeasonName = filteredPeriods.reduce<Record<string, AcademicPeriod[]>>(
    (acc, period) => {
      const season = processedSeasons.find((s) => s.id === period.seasonId)
      if (season) {
        const seasonName = season.name
        if (!acc[seasonName]) {
          acc[seasonName] = []
        }
        acc[seasonName].push({
          ...period,
          name: season.name,
        })
      }
      return acc
    },
    {}
  )

  // Obtenemos el período y la temporada para la fecha seleccionada
  const selectedPeriod = selectedDate ? getPeriodForDate(selectedDate) : undefined
  const selectedSeason = selectedDate ? getSeasonForDate(selectedDate) : undefined

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendario Académico {selectedYear}</CardTitle>
          <CardDescription>
            Visualiza los períodos académicos, temporadas y semanas especiales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue={selectedYear.toString()}
            onValueChange={(value) => onYearChange(parseInt(value))}
          >
            <TabsList className="mb-4">
              {availableYears.map((year) => (
                <TabsTrigger key={year} value={year.toString()}>
                  {year}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedYear.toString()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 p-12">
                  <CustomCalendar
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentMonth}
                    onMonthChange={handleMonthChange}
                    locale={es}
                    className="border rounded-md"
                    modifiers={modifiers}
                    modifiersClassNames={{
                      today: 'bg-primary/10',
                      periodStart:
                        'after:content-[""] after:absolute after:bottom-0 after:left-1/4 after:right-1/4 after:h-0.5 after:bg-primary',
                      activePeriod: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
                      specialPeriod: 'bg-pink-100 hover:bg-pink-200 text-pink-800',
                      normalPeriod: 'bg-blue-50',
                    }}
                  />

                  <div className="mt-4 flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-50"></div>
                      <span className="text-sm">Período Regular</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-pink-100"></div>
                      <span className="text-sm">Semana Especial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-100"></div>
                      <span className="text-sm">Período Actual</span>
                    </div>
                  </div>
                </div>

                <div>
                  {selectedDate && selectedPeriod ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium">{selectedPeriod.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(selectedPeriod.startDate, 'PPP', { locale: es })} al{' '}
                          {format(selectedPeriod.endDate, 'PPP', { locale: es })}
                        </p>

                        {selectedPeriod.isSpecialWeek ? (
                          <Badge className="mt-2 bg-pink-500">Semana Especial</Badge>
                        ) : selectedPeriod.isActive ? (
                          <Badge className="mt-2 bg-green-500">Período Actual</Badge>
                        ) : null}
                      </div>

                      {selectedSeason && (
                        <div className="pt-2">
                          <h4 className="font-medium text-sm">
                            {SeasonDisplayNames[selectedSeason.name as SeasonName]}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedSeason.description || `Temporada del año ${selectedYear}`}
                          </p>
                        </div>
                      )}

                      {selectedPeriod.isSpecialWeek && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Semana especial</AlertTitle>
                          <AlertDescription>
                            Las semanas especiales ofrecen actividades temáticas y la oportunidad de
                            ganar créditos adicionales.
                          </AlertDescription>
                        </Alert>
                      )}

                      {onPeriodSelect && !selectedPeriod.isSpecialWeek && (
                        <button
                          onClick={() => onPeriodSelect(selectedPeriod.id)}
                          className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline"
                        >
                          <Info className="mr-1 h-4 w-4" />
                          Ver detalles del período
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">
                        Selecciona una fecha para ver detalles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(periodsBySeasonName).map(([seasonName, periods]) => (
          <Card key={seasonName}>
            <CardHeader>
              <CardTitle>{SeasonDisplayNames[seasonName as SeasonName]}</CardTitle>
              <CardDescription>{periods.length} períodos en esta temporada</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {periods
                  .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
                  .map((period) => (
                    <li key={period.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <div className="font-medium">{period.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(period.startDate, 'PPP', { locale: es })} al{' '}
                          {format(period.endDate, 'PPP', { locale: es })}
                        </div>
                      </div>
                      <div>
                        {period.isSpecialWeek ? (
                          <Badge className="bg-pink-500">Especial</Badge>
                        ) : period.isActive ? (
                          <Badge className="bg-green-500">Actual</Badge>
                        ) : null}
                      </div>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default AcademicPeriodCalendar
