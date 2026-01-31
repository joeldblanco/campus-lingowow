'use client'

import { useEffect, useState } from 'react'
import { TeacherPaymentsTable } from '@/components/admin/payments/teacher-payments-table'
import { PaymentFilters } from '@/components/admin/payments/payment-filters'
import { PaymentSummaryCards } from '@/components/admin/payments/payment-summary-cards'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  getTeacherPaymentDetails,
  getPaymentPeriodSummary,
  getActiveTeachers,
  type TeacherPaymentDetail,
  type PaymentPeriodSummary,
} from '@/lib/actions/teacher-payments'
import { startOfMonth, endOfMonth } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
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
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string; email: string; rankName: string | null }>>([])
  const [filters, setFilters] = useState<{
    teacherId?: string
    startDate?: Date
    endDate?: Date
  }>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  })

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [teachersData] = await Promise.all([
        getActiveTeachers(),
      ])
      setTeachers(teachersData)
      await applyFilters(filters)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = async (newFilters: typeof filters) => {
    setLoading(true)
    try {
      const [paymentsData, summaryData] = await Promise.all([
        getTeacherPaymentDetails(
          newFilters.startDate,
          newFilters.endDate,
          newFilters.teacherId
        ),
        getPaymentPeriodSummary(newFilters.startDate, newFilters.endDate),
      ])
      setPayments(paymentsData)
      setSummary(summaryData)
      setFilters(newFilters)
    } catch (error) {
      console.error('Error applying filters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const csvContent = [
      ['Profesor', 'Email', 'Rango', 'Clases', 'Horas', 'Pago Total', 'Promedio/Clase'].join(','),
      ...payments.map((p) =>
        [
          p.teacherName,
          p.teacherEmail,
          p.rankName || '-',
          p.totalClasses,
          p.totalHours.toFixed(1),
          p.totalPayment.toFixed(2),
          p.averagePerClass.toFixed(2),
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `pagos-profesores-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          Los pagos se calculan automáticamente basándose en las clases completadas con asistencia confirmada
          del profesor y del estudiante. El monto puede variar según el curso, el rango del profesor y la
          configuración personalizada de pago por clase.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <PaymentFilters
          teachers={teachers}
          onFilterChange={applyFilters}
          onExport={handleExport}
        />

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {summary && <PaymentSummaryCards summary={summary} />}

            <TeacherPaymentsTable
              data={payments}
              title="Desglose de Pagos por Profesor"
              description={`Período: ${filters.startDate ? filters.startDate.toLocaleDateString('es-ES') : 'Inicio'} - ${filters.endDate ? filters.endDate.toLocaleDateString('es-ES') : 'Fin'}`}
            />
          </>
        )}
      </div>
    </div>
  )
}
