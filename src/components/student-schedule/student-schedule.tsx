'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { StudentScheduleHeader } from './student-schedule-header'
import { StudentWeekView } from './student-week-view'
import { StudentDayView } from './student-day-view'
import { StudentMonthView } from './student-month-view'
import { UpcomingClassCard } from './upcoming-class-card'
import { TutorsList } from './tutors-list'
import { WeeklyProgressCard } from './weekly-progress-card'
import { LessonDetailsDialog } from './lesson-details-dialog'
import type { ScheduleViewType } from '@/types/schedule'
import { isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { 
  getStudentScheduleData, 
  getUpcomingLesson,
  type StudentScheduleLesson, 
  type StudentTutor,
  type WeeklyProgress 
} from '@/lib/actions/student-schedule'
import { Loader2 } from 'lucide-react'

interface StudentScheduleProps {
  initialData?: {
    lessons: StudentScheduleLesson[]
    tutors: StudentTutor[]
    weeklyProgress: WeeklyProgress
  }
}

export function StudentSchedule({ initialData }: StudentScheduleProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ScheduleViewType>('week')
  const [isLoading, setIsLoading] = useState(!initialData)
  const [lessons, setLessons] = useState<StudentScheduleLesson[]>(initialData?.lessons || [])
  const [tutors, setTutors] = useState<StudentTutor[]>(initialData?.tutors || [])
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress>(
    initialData?.weeklyProgress || { completed: 0, total: 0, percentage: 0 }
  )
  const [upcomingLesson, setUpcomingLesson] = useState<{
    id: string
    courseTitle: string
    topic: string
    teacher: { id: string; name: string; lastName: string | null; image: string | null }
    startTime: string
    endTime: string
    startsIn: string
    date: string
  } | null>(null)
  
  // Compact mode state
  const [isCompact, setIsCompact] = useState(false)
  
  // Dialog states
  const [selectedLesson, setSelectedLesson] = useState<StudentScheduleLesson | null>(null)
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      const [scheduleResult, upcomingResult] = await Promise.all([
        getStudentScheduleData(monthStart, monthEnd),
        getUpcomingLesson(),
      ])
      
      if (scheduleResult.success && scheduleResult.data) {
        setLessons(scheduleResult.data.lessons)
        setTutors(scheduleResult.data.tutors)
        setWeeklyProgress(scheduleResult.data.weeklyProgress)
      }

      if (upcomingResult.success && upcomingResult.data) {
        setUpcomingLesson(upcomingResult.data)
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentDate])

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

    const filterByDateRange = (items: StudentScheduleLesson[]) =>
      items.filter((item) => {
        const itemDate = item.date instanceof Date ? item.date : new Date(item.date)
        if (viewType === 'day') {
          return isSameDay(itemDate, currentDate)
        }
        return isWithinInterval(itemDate, { start: startDate, end: endDate })
      })

    return {
      lessons: filterByDateRange(lessons),
    }
  }, [currentDate, viewType, lessons])

  // Get current lesson (in progress)
  const currentLesson = useMemo(() => {
    return filteredData.lessons.find((lesson) => lesson.status === 'in_progress')
  }, [filteredData.lessons])

  // Handlers
  const handleJoinClass = (lessonId: string) => {
    router.push(`/classroom?lessonId=${lessonId}`)
  }

  const handleViewMaterials = (lessonId: string) => {
    router.push(`/courses/materials?lessonId=${lessonId}`)
  }

  const handleBookLesson = () => {
    router.push('/calendar')
  }

  const handleDayClick = (date: Date) => {
    setCurrentDate(date)
    setViewType('day')
  }

  const handleLessonClick = (lesson: StudentScheduleLesson) => {
    setSelectedLesson(lesson)
    setLessonDialogOpen(true)
  }

  const handleContactTeacher = (email: string) => {
    window.location.href = `mailto:${email}`
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
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-[1600px] mx-auto">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <StudentScheduleHeader
          currentDate={currentDate}
          viewType={viewType}
          onDateChange={setCurrentDate}
          onViewChange={setViewType}
          onBookLesson={handleBookLesson}
          lessonsCount={viewType === 'day' ? filteredData.lessons.length : undefined}
          isCompact={isCompact}
          onToggleCompact={() => setIsCompact(!isCompact)}
        />

        {isLoading && (
          <div className="absolute top-4 right-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {viewType === 'week' && (
          <StudentWeekView
            currentDate={currentDate}
            lessons={filteredData.lessons}
            onJoinClass={handleJoinClass}
            onLessonClick={handleLessonClick}
            isCompact={isCompact}
          />
        )}

        {viewType === 'day' && (
          <StudentDayView
            lessons={filteredData.lessons}
            currentLesson={currentLesson}
            onJoinClass={handleJoinClass}
            onViewMaterials={handleViewMaterials}
            onLessonClick={handleLessonClick}
          />
        )}

        {viewType === 'month' && (
          <StudentMonthView
            currentDate={currentDate}
            lessons={filteredData.lessons}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        <UpcomingClassCard
          lesson={upcomingLesson}
          onJoinClass={handleJoinClass}
          onViewMaterials={handleViewMaterials}
        />
        
        <TutorsList
          tutors={tutors}
          onContactTutor={handleContactTeacher}
        />
        
        <WeeklyProgressCard progress={weeklyProgress} />
      </div>

      {/* Lesson Details Dialog */}
      <LessonDetailsDialog
        lesson={selectedLesson}
        open={lessonDialogOpen}
        onOpenChange={setLessonDialogOpen}
        onJoinClass={handleJoinClass}
        onViewMaterials={handleViewMaterials}
        onContactTeacher={handleContactTeacher}
      />
    </div>
  )
}
