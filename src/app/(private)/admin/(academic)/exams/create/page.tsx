'use client'

import { ExamBuilder } from '@/components/admin/exams/exam-builder'

export default function CreateExamPage() {
  return (
    <div className="container mx-auto py-6">
      <ExamBuilder mode="create" />
    </div>
  )
}
