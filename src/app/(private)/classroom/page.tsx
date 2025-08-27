// /app/student/classroom/[id]/page.tsx
'use client'

import { ClassroomLayout } from '@/components/classroom/classroom-layout'

interface ClassroomPageProps {
  params: {
    id: string
  }
}

export default function ClassroomPage({ params }: ClassroomPageProps) {
  const classId = params.id

  // En un caso real, estos datos vendrían de tu base de datos
  const mockData = {
    studentId: 'student-123',
    teacherId: 'teacher-456',
    courseName: 'Inglés Intermedio B1',
    lessonName: 'Lección 5: Tiempos verbales en pasado',
  }

  return (
    <ClassroomLayout
      classId={classId}
      studentId={mockData.studentId}
      teacherId={mockData.teacherId}
      courseName={mockData.courseName}
      lessonName={mockData.lessonName}
    />
  )
}
