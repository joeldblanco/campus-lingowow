'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TimeSlotWithStudent } from '@/components/calendar/time-slot-with-students'
import { AvailabilityRange, generateTimeSlots, isTimeSlotInAnyRange } from '@/lib/utils/calendar'
import { UserRole } from '@prisma/client'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

interface DateViewProps {
  userRole: UserRole
  teacherAvailability: Record<string, AvailabilityRange[]>
  bookedSlots: Record<string, string[]>
  onSlotAction: (day: string, time: string) => void
  slotDuration: number
  startHour: number
  endHour: number
  isDragging: boolean
  onStartDrag: (day: string, time: string, isAvailable: boolean) => void
  onDrag: (day: string, time: string, isAvailable: boolean) => void
  onEndDrag: () => void
  showStudentNames?: boolean
  getStudentInfo?: (day: string, time: string) => { name: string; color: string } | null
}

export function DateView({
  userRole,
  teacherAvailability,
  bookedSlots,
  onSlotAction,
  slotDuration,
  startHour,
  endHour,
  isDragging,
  onStartDrag,
  onDrag,
  onEndDrag,
  showStudentNames,
  getStudentInfo,
}: DateViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const allTimeSlots = generateTimeSlots(slotDuration, startHour, endHour)
  const [useAccordion, setUseAccordion] = useState(window?.innerWidth < 768)

  const weekDays = Array.from({ length: 5 }).map((_, index) => {
    return addDays(currentWeekStart, index)
  })

  // Listen for mouseup event globally to end dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        onEndDrag()
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)

    // Check screen size for accordion
    const handleResize = () => {
      setUseAccordion(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('resize', handleResize)
    }
  }, [isDragging, onEndDrag])

  const navigateToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7))
  }

  const navigateToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7))
  }

  const formatDateKey = (date: Date) => {
    return format(date, 'yyyy-MM-dd')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="icon" onClick={navigateToPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-medium">
          {format(currentWeekStart, 'd MMMM', { locale: es }).toUpperCase()} -{' '}
          {format(addDays(currentWeekStart, 4), 'd MMMM, yyyy', { locale: es }).toUpperCase()}
        </h2>
        <Button variant="outline" size="icon" onClick={navigateToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {useAccordion ? (
        <div className="md:hidden">
          {weekDays.map((date) => {
            const dateKey = formatDateKey(date)
            const isSelected = isSameDay(date, selectedDate)

            return (
              <div key={dateKey} className="mb-4">
                <div
                  className={`p-3 rounded-t-md bg-muted font-medium ${
                    isSelected ? 'bg-primary text-primary-foreground' : ''
                  }`}
                  onClick={() => setSelectedDate(date)}
                >
                  {format(date, 'EEEE', { locale: es }).toUpperCase()} -{' '}
                  {format(date, 'd MMM', { locale: es }).toUpperCase()}
                </div>
                <div className="p-3 border rounded-b-md space-y-2">
                  {allTimeSlots.length > 0 ? (
                    allTimeSlots.map((time) => {
                      const isAvailable =
                        userRole === UserRole.TEACHER
                          ? isTimeSlotInAnyRange(time, teacherAvailability[dateKey])
                          : false // Para uso en onStartDrag y onDrag solamente

                      const studentInfo =
                        showStudentNames && getStudentInfo ? getStudentInfo(dateKey, time) : null

                      return (
                        <TimeSlotWithStudent
                          key={`${dateKey}-${time}`}
                          time={time}
                          day={dateKey}
                          userRole={userRole}
                          teacherAvailability={teacherAvailability}
                          bookedSlots={bookedSlots}
                          onClick={() => !isDragging && onSlotAction(dateKey, time)}
                          onMouseDown={() =>
                            userRole === UserRole.TEACHER && onStartDrag(dateKey, time, isAvailable)
                          }
                          onMouseEnter={() =>
                            userRole === UserRole.TEACHER &&
                            isDragging &&
                            onDrag(dateKey, time, isAvailable)
                          }
                          onMouseUp={() => userRole === UserRole.TEACHER && onEndDrag()}
                          studentInfo={studentInfo}
                        />
                      )
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      {userRole === UserRole.STUDENT
                        ? 'No hay horarios disponibles'
                        : 'Haz clic para establecer disponibilidad'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4 md:block">
          <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-4">
            {weekDays.map((date) => {
              const dateKey = formatDateKey(date)
              const isSelected = isSameDay(date, selectedDate)

              return (
                <Card
                  key={dateKey}
                  className={`h-full ${isSelected ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-center text-sm">
                      {format(date, 'EEE', { locale: es }).toUpperCase()}
                      <br />
                      {format(date, 'd MMM', { locale: es }).toUpperCase()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {allTimeSlots.length > 0 ? (
                      allTimeSlots.map((time) => {
                        const isAvailable =
                          userRole === UserRole.TEACHER
                            ? isTimeSlotInAnyRange(time, teacherAvailability[dateKey])
                            : false // Para uso en onStartDrag y onDrag solamente

                        const studentInfo =
                          showStudentNames && getStudentInfo ? getStudentInfo(dateKey, time) : null

                        return (
                          <TimeSlotWithStudent
                            key={`${dateKey}-${time}`}
                            time={time}
                            day={dateKey}
                            userRole={userRole}
                            teacherAvailability={teacherAvailability}
                            bookedSlots={bookedSlots}
                            onClick={() => !isDragging && onSlotAction(dateKey, time)}
                            onMouseDown={() =>
                              userRole === UserRole.TEACHER &&
                              onStartDrag(dateKey, time, isAvailable)
                            }
                            onMouseEnter={() =>
                              userRole === UserRole.TEACHER &&
                              isDragging &&
                              onDrag(dateKey, time, isAvailable)
                            }
                            onMouseUp={() => userRole === UserRole.TEACHER && onEndDrag()}
                            studentInfo={studentInfo}
                          />
                        )
                      })
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        {userRole === UserRole.STUDENT
                          ? 'No hay horarios disponibles'
                          : 'Haz clic para establecer disponibilidad'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
