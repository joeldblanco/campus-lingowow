'use client'

import { useEffect, useState } from 'react'
import { TeacherPaymentsTable } from '@/components/admin/payments/teacher-payments-table'
import {
  PaymentFilters,
  type AcademicPeriodOption,
} from '@/components/admin/payments/payment-filters'
import { PaymentSummaryCards } from '@/components/admin/payments/payment-summary-cards'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  getTeacherPaymentsReport,
  getActiveTeachers,
  type TeacherPaymentDetail,
  type PaymentPeriodSummary,
  type TeacherPaymentFilters,
} from '@/lib/actions/teacher-payments'
import { getRelevantPeriods } from '@/lib/actions/academic-period'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'
import { downloadCSV } from '@/components/analytics/export-button'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function TeacherPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<TeacherPaymentDetail[]>([])
  const [summary, setSummary] = useState<PaymentPeriodSummary | null>(null)
  const [teachers, setTeachers] = useState<
    Array<{ id: string; name: string; email: string; rankName: string | null }>
  >([])
  const [periods, setPeriods] = useState<AcademicPeriodOption[]>([])
  const [filterLabel, setFilterLabel] = useState('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [teachersData, periodsData] = await Promise.all([
        getActiveTeachers(),
        getRelevantPeriods(),
      ])
      setTeachers(teachersData)
      setPeriods(periodsData)

      // Auto-cargar con el período activo
      const activePeriod = periodsData.find((p) => p.isActive)
      if (activePeriod) {
        const initialFilters = { periodId: activePeriod.id }
        await applyFilters(initialFilters, periodsData)
      } else {
        await applyFilters({}, periodsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = async (newFilters: TeacherPaymentFilters, currentPeriods?: AcademicPeriodOption[]) => {
    setLoading(true)
    try {
      const report = await getTeacherPaymentsReport(newFilters)
      setPayments(report.teacherReports)
      setSummary(report.summary)

      const availablePeriods = currentPeriods || periods
      if (newFilters.periodId) {
        const period = availablePeriods.find((p) => p.id === newFilters.periodId)
        setFilterLabel(period ? period.name : 'Período seleccionado')
      } else if (newFilters.startDate && newFilters.endDate) {
        setFilterLabel(
          `${newFilters.startDate.toLocaleDateString('es-ES')} - ${newFilters.endDate.toLocaleDateString('es-ES')}`
        )
      } else {
        setFilterLabel('Mes actual')
      }
    } catch (error) {
      console.error('Error applying filters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSummaryExport = () => {
    const csvData = payments.map((p) => ({
      Profesor: p.teacherName,
      Email: p.teacherEmail,
      Rango: p.rankName || '-',
      Multiplicador: p.rateMultiplier,
      'Método de Pago': p.paymentMethod || 'No configurado',
      'Pago Confirmado': p.paymentConfirmed ? 'Sí' : 'No',
      Clases: p.totalClasses,
      Horas: p.totalHours.toFixed(1),
      'Pago Total': p.totalPayment.toFixed(2),
      'Promedio/Clase': p.averagePerClass.toFixed(2),
    }))

    downloadCSV(csvData, `pagos-profesores-${new Date().toISOString().split('T')[0]}`)
  }

  const handleDetailExport = () => {
    const csvData = payments.flatMap((teacher) =>
      teacher.classes.map((classItem) => ({
        Profesor: teacher.teacherName,
        Email: teacher.teacherEmail,
        Rango: teacher.rankName || '-',
        'Método de Pago': teacher.paymentMethod || 'No configurado',
        'Pago Confirmado': teacher.paymentConfirmed ? 'Sí' : 'No',
        Fecha: classItem.day,
        Hora: classItem.timeSlot,
        Estudiante: classItem.studentName,
        Curso: classItem.courseName,
        'Período Académico': classItem.academicPeriodName || '-',
        'Duración (min)': classItem.duration,
        'Monto Clase': classItem.payment.toFixed(2),
        'Marcada Pagable': classItem.isPayable ? 'Sí' : 'No',
      }))
    )

    downloadCSV(csvData, `detalle-clases-pagables-${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pagos a Profesores</h1>
        <p className="text-muted-foreground">
          Gestión y seguimiento de pagos por clases impartidas
        </p>
      </div>

      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Información sobre Pagos</AlertTitle>
        <AlertDescription>
          Esta vista consolida el resumen de pagos y el detalle de clases pagables. Los montos se
          calculan a partir de clases completadas con asistencia registrada del profesor, y pueden
          variar según curso, rango y configuración personalizada de pago.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <PaymentFilters
          teachers={teachers}
          periods={periods}
          onFilterChange={(f) => applyFilters(f)}
          exportActions={[
            {
              label: 'Exportar resumen CSV',
              onClick: handleSummaryExport,
              disabled: payments.length === 0,
            },
            {
              label: 'Exportar detalle CSV',
              onClick: handleDetailExport,
              disabled: payments.length === 0,
            },
          ]}
        />

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {summary && <PaymentSummaryCards summary={summary} />}

            <TeacherPaymentsTable
              data={payments}
              title="Pagos y Clases Pagables por Profesor"
              description={`Período: ${filterLabel}${summary ? ` • ${summary.totalPayableClasses} clases pagables de ${summary.totalCompletedClasses} completadas` : ''}`}
            />
          </>
        )}
      </div>
    </div>
  )
}
