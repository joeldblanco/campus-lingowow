import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getExamForPreview } from '@/lib/actions/teacher-exams'
import { ExamPreviewClient } from './exam-preview-client'

interface PageProps {
  params: Promise<{ examId: string }>
}

export default async function TeacherExamPreviewPage({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const { examId } = await params
  const result = await getExamForPreview(examId)

  if (!result.success || !result.exam) {
    notFound()
  }

  const { exam } = result

  // Tipo para los datos parseados de opciones
  type ParsedOptions = {
    options: string[] | null
    multipleChoiceItems: { id: string; question: string; options: { id: string; text: string }[] }[] | null
    originalBlockType: string | null
    blockData: {
      url?: string
      content?: string
      title?: string
      instruction?: string
      timeLimit?: number
      aiGrading?: boolean
      maxReplays?: number
    } | null
  }

  // Función para parsear opciones que pueden venir como JSON string, array u objeto
  const parseQuestionOptions = (options: unknown): ParsedOptions => {
    const defaultResult: ParsedOptions = { options: null, multipleChoiceItems: null, originalBlockType: null, blockData: null }
    
    if (!options) return defaultResult
    
    // Si es un array de strings, son opciones simples
    if (Array.isArray(options)) {
      return { ...defaultResult, options: options as string[] }
    }
    
    // Función auxiliar para procesar objeto
    const processObject = (obj: Record<string, unknown>): ParsedOptions => {
      // Si tiene originalBlockType, es un bloque no interactivo
      if (obj.originalBlockType) {
        return {
          options: null,
          multipleChoiceItems: null,
          originalBlockType: obj.originalBlockType as string,
          blockData: {
            url: obj.url as string | undefined,
            content: obj.content as string | undefined,
            title: obj.title as string | undefined,
            instruction: obj.instruction as string | undefined,
            timeLimit: obj.timeLimit as number | undefined,
            aiGrading: obj.aiGrading as boolean | undefined,
            maxReplays: obj.maxReplays as number | undefined,
          }
        }
      }
      // Si tiene multipleChoiceItems
      if (obj.multipleChoiceItems) {
        return {
          ...defaultResult,
          multipleChoiceItems: obj.multipleChoiceItems as ParsedOptions['multipleChoiceItems']
        }
      }
      return defaultResult
    }
    
    // Si es un string, intentar parsear como JSON
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options)
        if (Array.isArray(parsed)) {
          return { ...defaultResult, options: parsed }
        }
        if (typeof parsed === 'object' && parsed !== null) {
          return processObject(parsed)
        }
      } catch {
        return defaultResult
      }
    }
    
    // Si es un objeto
    if (typeof options === 'object' && options !== null) {
      return processObject(options as Record<string, unknown>)
    }
    
    return defaultResult
  }

  const sections = exam.sections.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    questions: section.questions.map(q => {
      const parsed = parseQuestionOptions(q.options)
      return {
        id: q.id,
        type: q.type,
        question: q.question,
        options: parsed.options,
        multipleChoiceItems: parsed.multipleChoiceItems,
        originalBlockType: parsed.originalBlockType,
        blockData: parsed.blockData,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points,
        minLength: q.minLength,
        maxLength: q.maxLength,
      }
    })
  }))

  return (
    <ExamPreviewClient
      examId={examId}
      title={exam.title}
      description={exam.description}
      courseName={exam.course?.title}
      sections={sections}
      timeLimit={exam.timeLimit || 60}
      passingScore={exam.passingScore}
      totalPoints={exam.totalPoints}
      questionCount={exam.questionCount}
    />
  )
}
