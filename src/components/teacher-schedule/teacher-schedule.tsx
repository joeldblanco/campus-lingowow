'use client'

import {
  bulkUpdateTeacherAvailability,
  getTeacherScheduleData,
} from '@/lib/actions/teacher-schedule'
import { openClassroomWindow } from '@/lib/open-classroom-window'
import type {
  AvailableSlot,
  ScheduleLesson,
  ScheduleViewType,
  TeacherAvailabilitySlot,
  TeacherScheduleLesson,
} from '@/types/schedule'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AvailabilityEditView } from './availability-edit-view'
import { DayView } from './day-view'
import { LessonDetailsDialog } from './lesson-details-dialog'
import { MonthView } from './month-view'
import { ScheduleHeader } from './schedule-header'
import { WeekView } from './week-view'

interface TeacherScheduleProps {
  initialData?: {
    lessons: TeacherScheduleLesson[]
    availability: TeacherAvailabilitySlot[]
    blockedDays: string[]
  }
  currentPeriod?: {
    id: string
    name: string
    dates: string
  } | null
}

// Parse date string as local date (not UTC)
function parseLocalDate(dateInput: Date | string): Date {
  if (dateInput instanceof Date) {
    // If it's already a Date, extract the date parts and create a local date
    const year = dateInput.getFullYear()
    const month = dateInput.getMonth()
    const day = dateInput.getDate()
    return new Date(year, month, day, 12, 0, 0, 0) // Use noon to avoid DST issues
  }
  // If it's a string like "2026-01-02", parse as local date
  const dateStr = typeof dateInput === 'string' ? dateInput : String(dateInput)
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0) // Use noon to avoid DST issues
}

// Transform server lessons to client format
function transformLessons(serverLessons: TeacherScheduleLesson[]): ScheduleLesson[] {
  return serverLessons.map((lesson) => ({
    id: lesson.id,
    courseTitle: lesson.courseTitle,
    courseLevel: lesson.courseLevel,
    courseId: lesson.courseId,
    student: {
      id: lesson.student.id,
      name: lesson.student.name,
      lastName: lesson.student.lastName,
      email: lesson.student.email,
      image: lesson.student.image,
    },
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    date: parseLocalDate(lesson.date),
    status: lesson.status,
    topic: lesson.topic,
    duration: lesson.duration,
    roomUrl: lesson.roomUrl,
    color: lesson.color,
  }))
}

export function TeacherSchedule({ initialData, currentPeriod }: TeacherScheduleProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ScheduleViewType>('week')
  const [isLoading, setIsLoading] = useState(!initialData)
  const [lessons, setLessons] = useState<ScheduleLesson[]>(
    initialData ? transformLessons(initialData.lessons) : []
  )
  const [availability, setAvailability] = useState<TeacherAvailabilitySlot[]>(
    initialData?.availability || []
  )
  const [blockedDays, setBlockedDays] = useState<string[]>(initialData?.blockedDays || [])

  // Dialog states
  const [selectedLesson, setSelectedLesson] = useState<ScheduleLesson | null>(null)
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)

  // Compact mode state
  const [isCompact, setIsCompact] = useState(false)

  // Track loaded month to prevent unnecessary refetches
  const lastFetchedMonth = useRef<string>(initialData ? format(currentDate, 'yyyy-MM') : '')

  // Fetch data - always fetch for the full month to have all data available
  const fetchData = useCallback(
    async (force = false) => {
      const monthStart = startOfMonth(currentDate)
      const monthKey = format(monthStart, 'yyyy-MM')

      // If we're in the same month and not forcing a refresh, don't fetch
      if (!force && lastFetchedMonth.current === monthKey) {
        return
      }

      setIsLoading(true)
      try {
        // Always fetch the full month to ensure we have all lessons
        // This prevents data from disappearing when switching views
        const monthEnd = endOfMonth(currentDate)

        console.log('[SCHEDULE CLIENT] calling getTeacherScheduleData', { monthStart: monthStart.toISOString(), monthEnd: monthEnd.toISOString() })
        const result = await getTeacherScheduleData(monthStart, monthEnd)
        console.log('[SCHEDULE CLIENT] result:', JSON.stringify({ success: result.success, error: result.error, lessons: result.data?.lessons?.length, availability: result.data?.availability?.length, blocked: result.data?.blockedDays?.length }))

        if (result.success && result.data) {
          setLessons(transformLessons(result.data.lessons))
          setAvailability(result.data.availability)
          setBlockedDays(result.data.blockedDays)
          lastFetchedMonth.current = monthKey
        }
      } catch (error) {
        console.error('Error fetching schedule data:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [currentDate]
  )

  // Only refetch when the month changes, not on every view change
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter data based on current view
  const filteredData = useMemo(() => {
    let startDate: Date
    let endDate: Date

    switch (viewType) {
      case 'day':
        startDate = currentDate
        endDate = currentDate
        break
      case 'week':
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
        break
    }

    const filterByDateRange = <T extends { date: Date }>(items: T[]) =>
      items.filter((item) => {
        // Ensure we're working with Date objects
        const itemDate = item.date instanceof Date ? item.date : new Date(item.date)
        if (viewType === 'day') {
          return isSameDay(itemDate, currentDate)
        }
        return isWithinInterval(itemDate, { start: startDate, end: endDate })
      })

    // Transform availability (day-of-week based) to date-specific AvailableSlot objects
    const dayNameToIndex: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    }

    const availableSlots: AvailableSlot[] = []
    // Iterate each day in the view range and check if any availability slot matches
    let cursor = new Date(startDate)
    cursor.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    while (cursor <= end) {
      const dayIndex = getDay(cursor) // 0=Sunday..6=Saturday
      const dateStr = format(cursor, 'yyyy-MM-dd')
      const isBlocked = blockedDays.includes(dateStr)

      if (!isBlocked) {
        for (const slot of availability) {
          const slotDayIndex = dayNameToIndex[slot.day.toLowerCase()]
          if (slotDayIndex === dayIndex) {
            // Check no lesson already occupies this exact time
            const hasLesson = lessons.some(
              (l) => isSameDay(l.date, cursor) && l.startTime === slot.startTime
            )
            if (!hasLesson) {
              const [sh, sm] = slot.startTime.split(':').map(Number)
              const [eh, em] = slot.endTime.split(':').map(Number)
              const duration = (eh * 60 + em) - (sh * 60 + sm)
              availableSlots.push({
                id: `${slot.id}-${dateStr}`,
                startTime: slot.startTime,
                endTime: slot.endTime,
                date: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 12, 0, 0, 0),
                duration: duration > 0 ? duration : 60,
              })
            }
          }
        }
      }
      cursor = addDays(cursor, 1)
    }

    return {
      lessons: filterByDateRange(lessons),
      availableSlots,
      blockedDays,
    }
  }, [currentDate, viewType, lessons, availability, blockedDays])

  // Get current lesson (in progress)
  const currentLesson = useMemo(() => {
    return filteredData.lessons.find((lesson) => lesson.status === 'in_progress')
  }, [filteredData.lessons])

  // Handlers
  const handleJoinClass = (lessonId: string) => {
    openClassroomWindow(`/classroom?classId=${lessonId}`)
  }

  const handleViewMaterials = (lessonId: string) => {
    // Find the lesson to get the courseId
    const lesson = lessons.find((l) => l.id === lessonId)
    if (lesson?.courseId) {
      router.push(`/teacher/courses/${lesson.courseId}`)
    }
  }

  const handleMarkAttendance = (lessonId: string) => {
    console.log('Mark attendance for:', lessonId)
  }

  const handleEditAvailability = () => {
    setIsEditMode(true)
  }

  const handleSetAvailability = () => {
    setIsEditMode(true)
  }

  const handleDiscardChanges = () => {
    setIsEditMode(false)
  }

  const handleSaveAvailability = async (
    slots: Array<{ day: string; startTime: string; endTime: string; available: boolean }>
  ) => {
    setIsSavingAvailability(true)
    try {
      const result = await bulkUpdateTeacherAvailability(slots)
      if (result.success) {
        toast.success('Disponibilidad guardada correctamente')
        setIsEditMode(false)
        fetchData(true)
      } else {
        toast.error(result.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error al guardar la disponibilidad')
    } finally {
      setIsSavingAvailability(false)
    }
  }

  const handleSaveChanges = async () => {
    // Trigger save from the AvailabilityEditView via window
    const saveFn = (window as unknown as { __availabilitySave?: () => Promise<void> })
      .__availabilitySave
    if (saveFn) {
      await saveFn()
    }
  }

  const handleDayClick = (date: Date) => {
    setCurrentDate(date)
    setViewType('day')
  }

  const handleLessonClick = (lesson: ScheduleLesson) => {
    setSelectedLesson(lesson)
    setLessonDialogOpen(true)
  }

  const handleContactStudent = () => {
    router.push('/messages')
  }

  if (isLoading && lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando horario...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">
      <ScheduleHeader
        currentDate={currentDate}
        viewType={isEditMode ? 'week' : viewType}
        onDateChange={setCurrentDate}
        onViewChange={setViewType}
        onSetAvailability={handleSetAvailability}
        lessonsCount={viewType === 'day' ? filteredData.lessons.length : undefined}
        isEditMode={isEditMode}
        onSaveChanges={handleSaveChanges}
        onDiscardChanges={handleDiscardChanges}
        isSaving={isSavingAvailability}
        isCompact={isCompact}
        onToggleCompact={() => setIsCompact(!isCompact)}
        currentPeriod={currentPeriod}
      />

      {isLoading && (
        <div className="absolute top-4 right-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Edit Mode - Availability Editor */}
      {isEditMode && (
        <AvailabilityEditView
          currentDate={currentDate}
          lessons={lessons}
          initialAvailability={availability}
          onSave={handleSaveAvailability}
          onDiscard={handleDiscardChanges}
          isSaving={isSavingAvailability}
        />
      )}

      {/* Normal Mode - Schedule Views */}
      {!isEditMode && viewType === 'week' && (
        <WeekView
          currentDate={currentDate}
          lessons={filteredData.lessons}
          availableSlots={filteredData.availableSlots}
          blockedDays={filteredData.blockedDays}
          onJoinClass={handleJoinClass}
          onViewMaterials={handleViewMaterials}
          onLessonClick={handleLessonClick}
          isCompact={isCompact}
        />
      )}

      {!isEditMode && viewType === 'day' && (
        <DayView
          currentDate={currentDate}
          lessons={filteredData.lessons}
          availableSlots={filteredData.availableSlots}
          blockedDays={filteredData.blockedDays}
          currentLesson={currentLesson}
          onJoinClass={handleJoinClass}
          onViewMaterials={handleViewMaterials}
          onMarkAttendance={handleMarkAttendance}
          onEditAvailability={handleEditAvailability}
          onLessonClick={handleLessonClick}
        />
      )}

      {!isEditMode && viewType === 'month' && (
        <MonthView
          currentDate={currentDate}
          lessons={filteredData.lessons}
          availableSlots={filteredData.availableSlots}
          blockedDays={filteredData.blockedDays}
          onDayClick={handleDayClick}
        />
      )}

      {/* Lesson Details Dialog */}
      <LessonDetailsDialog
        lesson={selectedLesson}
        open={lessonDialogOpen}
        onOpenChange={setLessonDialogOpen}
        onJoinClass={handleJoinClass}
        onViewMaterials={handleViewMaterials}
        onContactStudent={handleContactStudent}
      />
    </div>
  )
}
