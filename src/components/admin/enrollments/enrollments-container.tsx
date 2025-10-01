'use client'

import { useState, useEffect } from 'react'
import { getAllEnrollments, getEnrollmentStats } from '@/lib/actions/enrollments'
import { EnrollmentWithDetails, EnrollmentStats } from '@/lib/actions/enrollments'
import { EnrollmentsTable } from './enrollments-table'
import { EnrollmentsStats } from './enrollments-stats'
import { CreateEnrollmentDialog } from './create-enrollment-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { EnrollmentsLoadingSkeleton } from './enrollments-loading-skeleton'

export function EnrollmentsContainer() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([])
  const [stats, setStats] = useState<EnrollmentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [enrollmentsData, statsData] = await Promise.all([getAllEnrollments(), getEnrollmentStats()])
      setEnrollments(enrollmentsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading enrollments data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (isLoading) {
    return <EnrollmentsLoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {stats && <EnrollmentsStats stats={stats} />}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Lista de Inscripciones</h2>
        <CreateEnrollmentDialog onEnrollmentCreated={loadData}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Inscripción
          </Button>
        </CreateEnrollmentDialog>
      </div>

      <EnrollmentsTable enrollments={enrollments} onEnrollmentUpdated={loadData} />
    </div>
  )
}
