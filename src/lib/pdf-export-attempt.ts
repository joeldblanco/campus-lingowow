import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface MultipleChoiceSubAnswer {
  itemQuestion: string
  userOptionLetter: string | null
  userOptionText: string | null
  correctOptionLetter: string
  correctOptionText: string
  isCorrect: boolean
}

interface QuestionAnswer {
  id: string
  questionId: string
  questionNumber: number | null
  questionType: string
  questionText: string
  category?: string
  maxPoints: number
  userAnswer: string | null
  userAudioUrl?: string
  correctAnswer?: string
  isCorrect: boolean | null
  pointsEarned: number
  needsReview: boolean
  feedback?: string | null
  isAutoGraded: boolean
  groupId?: string | null
  sectionTitle?: string
  isInformativeBlock?: boolean
  informativeContent?: {
    type: string
    audioUrl?: string
    videoUrl?: string
    imageUrl?: string
    text?: string
    title?: string
  }
  multipleChoiceDetails?: MultipleChoiceSubAnswer[]
}

interface AttemptData {
  studentName: string
  studentEmail: string
  examTitle: string
  examDescription?: string
  courseName?: string
  attemptNumber: number
  submittedAt: string
  totalScore: number
  maxScore: number
  timeSpent?: number
  answers: QuestionAnswer[]
  passingScore?: number
}

export async function exportAttemptToPDF(data: AttemptData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = margin

  // Colores de la marca
  const primaryColor = [59, 130, 246] as [number, number, number]
  const textGray = [107, 114, 128] as [number, number, number]
  const successColor = [34, 197, 94] as [number, number, number]
  const errorColor = [239, 68, 68] as [number, number, number]
  const warningColor = [234, 179, 8] as [number, number, number]

  // Función helper para agregar texto
  const addText = (text: string, fontSize: number, color: [number, number, number] = [0, 0, 0], x: number = margin, maxWidth?: number) => {
    pdf.setFontSize(fontSize)
    pdf.setTextColor(...color)
    
    if (maxWidth) {
      const lines = pdf.splitTextToSize(text, maxWidth)
      lines.forEach((line: string) => {
        pdf.text(line, x, yPosition)
        yPosition += fontSize * 0.5 + 2
      })
    } else {
      pdf.text(text, x, yPosition)
      yPosition += fontSize * 0.5 + 2
    }
  }

  // Función helper para verificar si necesitamos nueva página
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Header con logo y título
  pdf.setFillColor(...primaryColor)
  pdf.rect(0, 0, pageWidth, 45, 'F')
  
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(26)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Reporte de Examen', margin, 20)
  
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`${data.studentName}`, margin, 30)
  pdf.text(`${format(new Date(), 'dd MMMM yyyy', { locale: es })}`, margin, 38)

  yPosition = 60

  // Información del estudiante y examen
  addText('Información del Estudiante', 16, primaryColor)
  addText(`Nombre: ${data.studentName}`, 11)
  addText(`Email: ${data.studentEmail}`, 11, textGray)
  
  yPosition += 5
  
  addText('Información del Examen', 16, primaryColor)
  addText(`Examen: ${data.examTitle}`, 11)
  if (data.courseName) {
    addText(`Curso: ${data.courseName}`, 11, textGray)
  }
  addText(`Intento #${data.attemptNumber} - Enviado: ${data.submittedAt}`, 11, textGray)

  yPosition += 10

  // Estadísticas del intento
  checkPageBreak(60)
  addText('Resultados', 16, primaryColor)
  
  const statsY = yPosition
  const statsBoxHeight = 45
  const statsBoxWidth = (pageWidth - 2 * margin - 10) / 3

  const scorePercentage = data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0
  const passed = data.passingScore ? scorePercentage >= data.passingScore : null
  
  const answerableQuestions = data.answers.filter(a => !a.isInformativeBlock)
  const correctAnswers = answerableQuestions.filter(a => a.isCorrect === true).length
  const incorrectAnswers = answerableQuestions.filter(a => a.isCorrect === false).length
  const pendingReview = answerableQuestions.filter(a => a.needsReview).length

  const stats = [
    { 
      label: 'Puntaje', 
      value: `${data.totalScore}/${data.maxScore}`, 
      subtitle: `${scorePercentage}%`,
      color: passed === null ? primaryColor : (passed ? successColor : errorColor)
    },
    { 
      label: 'Correctas', 
      value: correctAnswers.toString(), 
      subtitle: `de ${answerableQuestions.length}`,
      color: successColor 
    },
    { 
      label: 'Incorrectas', 
      value: incorrectAnswers.toString(),
      subtitle: pendingReview > 0 ? `${pendingReview} pendientes` : '',
      color: errorColor 
    }
  ]

  stats.forEach((stat, index) => {
    const x = margin + index * (statsBoxWidth + 5)
    
    const lightColor = stat.color.map(c => Math.floor(c * 0.1)) as [number, number, number]
    pdf.setFillColor(...lightColor)
    pdf.rect(x, statsY, statsBoxWidth, statsBoxHeight, 'F')
    pdf.setDrawColor(...stat.color)
    pdf.setLineWidth(0.5)
    pdf.rect(x, statsY, statsBoxWidth, statsBoxHeight, 'S')
    
    pdf.setFontSize(22)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...stat.color)
    pdf.text(stat.value, x + 10, statsY + 20)
    
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...textGray)
    pdf.text(stat.label, x + 10, statsY + 30)
    
    if (stat.subtitle) {
      pdf.setFontSize(8)
      pdf.text(stat.subtitle, x + 10, statsY + 38)
    }
  })

  yPosition = statsY + statsBoxHeight + 15

  // Desglose de respuestas
  checkPageBreak(40)
  addText('Desglose de Respuestas', 16, primaryColor)
  yPosition += 5

  let currentQuestionNumber = 0

  for (const answer of data.answers) {
    // Saltar bloques informativos
    if (answer.isInformativeBlock) continue
    
    currentQuestionNumber++
    
    checkPageBreak(50)
    
    // Número y estado de la pregunta
    const questionColor = answer.needsReview ? warningColor : (answer.isCorrect ? successColor : errorColor)
    const statusIcon = answer.needsReview ? '⏳' : (answer.isCorrect ? '✓' : '✗')
    
    pdf.setFillColor(245, 245, 245)
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...questionColor)
    pdf.text(`${statusIcon} Pregunta ${currentQuestionNumber}`, margin + 3, yPosition)
    
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...textGray)
    pdf.text(`${answer.pointsEarned}/${answer.maxPoints} pts`, pageWidth - margin - 25, yPosition)
    
    yPosition += 10

    // Texto de la pregunta
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)
    const questionLines = pdf.splitTextToSize(answer.questionText, pageWidth - 2 * margin - 10)
    questionLines.forEach((line: string) => {
      checkPageBreak(10)
      pdf.text(line, margin + 5, yPosition)
      yPosition += 5
    })
    
    yPosition += 3

    // Respuesta del usuario y respuesta correcta
    if (answer.multipleChoiceDetails && answer.multipleChoiceDetails.length > 0) {
      // Opción múltiple con múltiples pasos
      answer.multipleChoiceDetails.forEach((detail, idx) => {
        checkPageBreak(25)
        
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...textGray)
        pdf.text(`${idx + 1}. ${detail.itemQuestion}`, margin + 5, yPosition)
        yPosition += 5
        
        const detailColor = detail.isCorrect ? successColor : errorColor
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...detailColor)
        
        const userAnswerText = detail.userOptionLetter 
          ? `Tu respuesta: (${detail.userOptionLetter}) ${detail.userOptionText}`
          : 'Tu respuesta: (Sin respuesta)'
        pdf.text(userAnswerText, margin + 8, yPosition)
        yPosition += 5
        
        if (!detail.isCorrect) {
          pdf.setTextColor(...successColor)
          pdf.text(`Correcta: (${detail.correctOptionLetter}) ${detail.correctOptionText}`, margin + 8, yPosition)
          yPosition += 5
        }
        
        yPosition += 2
      })
    } else {
      // Respuesta simple
      checkPageBreak(20)
      
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...textGray)
      pdf.text('Tu respuesta:', margin + 5, yPosition)
      yPosition += 5
      
      pdf.setFont('helvetica', 'normal')
      const answerColor = answer.needsReview ? warningColor : (answer.isCorrect ? successColor : errorColor)
      pdf.setTextColor(...answerColor)
      
      if (answer.userAudioUrl) {
        pdf.text('🎤 Grabación de audio enviada', margin + 8, yPosition)
      } else {
        const userAnswerText = answer.userAnswer || '(Sin respuesta)'
        const userAnswerLines = pdf.splitTextToSize(userAnswerText, pageWidth - 2 * margin - 15)
        userAnswerLines.forEach((line: string) => {
          checkPageBreak(8)
          pdf.text(line, margin + 8, yPosition)
          yPosition += 5
        })
      }
      
      yPosition += 3
      
      // Mostrar respuesta correcta si es incorrecta
      if (!answer.isCorrect && !answer.needsReview && answer.correctAnswer) {
        checkPageBreak(15)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...textGray)
        pdf.text('Respuesta correcta:', margin + 5, yPosition)
        yPosition += 5
        
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...successColor)
        const correctLines = pdf.splitTextToSize(answer.correctAnswer, pageWidth - 2 * margin - 15)
        correctLines.forEach((line: string) => {
          checkPageBreak(8)
          pdf.text(line, margin + 8, yPosition)
          yPosition += 5
        })
        
        yPosition += 3
      }
    }

    // Feedback del profesor
    if (answer.feedback) {
      checkPageBreak(15)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...primaryColor)
      pdf.text('💬 Comentario del profesor:', margin + 5, yPosition)
      yPosition += 5
      
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(...textGray)
      const feedbackLines = pdf.splitTextToSize(answer.feedback, pageWidth - 2 * margin - 15)
      feedbackLines.forEach((line: string) => {
        checkPageBreak(8)
        pdf.text(line, margin + 8, yPosition)
        yPosition += 5
      })
      
      yPosition += 3
    }

    yPosition += 5
  }

  // Footer en todas las páginas
  const totalPages = pdf.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    const footerY = pageHeight - 10
    pdf.setTextColor(...textGray)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 25, footerY)
    pdf.text('Generado por Lingowow', margin, footerY)
  }

  // Descargar el PDF
  const fileName = `examen-${data.studentName.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
  pdf.save(fileName)
}
