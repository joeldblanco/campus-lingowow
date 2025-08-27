import AcademicPeriodCalendar from '@/components/academic-period/academic-period-calendar'
import { getPeriods, getSeasons } from '@/lib/actions/academic-period'
import { SeasonName } from '@/types/academic-period'
import { AcademicPeriod, Season } from '@prisma/client' // Importamos los tipos desde prisma
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// Ejemplo de una página que usa el calendario
export default function AcademicCalendar() {
  // Estado para el año seleccionado
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  // Estados para almacenar los datos con tipos explícitos
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [seasons, setSeasons] = useState<(Season & { name: SeasonName })[]>([])
  const [loading, setLoading] = useState(true)

  // Función para cargar los datos - reemplaza esto con tu lógica real de obtención de datos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Simulación de una llamada a la API - reemplaza con tu lógica real
        const academicPeriods = await getPeriods()
        const seasons = await getSeasons()

        if (!academicPeriods.success || !academicPeriods.periods) {
          toast.error(academicPeriods.error)
          return
        }

        if (!seasons.success || !seasons.seasons) {
          toast.error(seasons.error)
          return
        }

        setPeriods(academicPeriods.periods)
        setSeasons(
          seasons.seasons.map((season) => ({
            ...season,
            name: season.name as SeasonName,
          }))
        )
      } catch (error) {
        console.error('Error al cargar los datos del calendario:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedYear]) // Actualizar cuando cambie el año seleccionado

  // Función para manejar el cambio de año
  const handleYearChange = (year: number) => {
    setSelectedYear(year)
  }

  // Función para manejar la selección de un periodo
  const handlePeriodSelect = (periodId: string) => {
    console.log(`Periodo seleccionado: ${periodId}`)
    // Aquí puedes añadir la lógica para navegar a la página de detalles del periodo
    // Por ejemplo: router.push(`/admin/academic-periods/${periodId}`)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Cargando calendario académico...</div>
  }

  return <></>

  return (
    <AcademicPeriodCalendar
      periods={periods}
      seasons={seasons}
      selectedYear={selectedYear}
      onYearChange={handleYearChange}
      onPeriodSelect={handlePeriodSelect}
    />
  )
}
