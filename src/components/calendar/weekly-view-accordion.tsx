'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { DayContent } from '@/components/calendar/day-content'
import { UserRole } from '@prisma/client'
import { AvailabilityRange } from '@/lib/utils/calendar'

interface WeeklyViewAccordionProps {
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

export function WeeklyViewAccordion({
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
}: WeeklyViewAccordionProps) {
  const weekDaysEs = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES']
  const weekDaysEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  return (
    <Accordion type="single" collapsible className="w-full">
      {weekDaysEs.map((dayEs, index) => {
        const dayEn = weekDaysEn[index]

        return (
          <AccordionItem key={dayEn} value={dayEn}>
            <AccordionTrigger>{dayEs}</AccordionTrigger>
            <AccordionContent>
              <DayContent
                day={dayEn}
                userRole={userRole}
                teacherAvailability={teacherAvailability}
                bookedSlots={bookedSlots}
                onSlotAction={onSlotAction}
                slotDuration={slotDuration}
                startHour={startHour}
                endHour={endHour}
                isDragging={isDragging}
                onStartDrag={onStartDrag}
                onDrag={onDrag}
                onEndDrag={onEndDrag}
                showStudentNames={showStudentNames}
                getStudentInfo={getStudentInfo}
              />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
