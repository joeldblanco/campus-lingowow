'use client'

import { useState, useEffect } from 'react'
import { getAllEnrollments } from '@/lib/actions/enrollments'
import { EnrollmentWithDetails } from '@/lib/actions/enrollments'
import { EnrollmentsTable } from './enrollments-table'
import { EnrollmentsLoadingSkeleton } from './enrollments-loading-skeleton'

export function EnrollmentsContainer() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const enrollmentsData = await getAllEnrollments()
      setEnrollments(enrollmentsData)
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

  return <EnrollmentsTable enrollments={enrollments} onEnrollmentUpdated={loadData} />
}
