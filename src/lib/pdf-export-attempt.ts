import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// --- Interfaces ---

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

// --- Design Tokens (Tailwind Match) ---

const colors = {
  primary: [19, 127, 236] as [number, number, number], // #137fec
  primaryLight: [235, 245, 255] as [number, number, number],
  success: [46, 125, 50] as [number, number, number], // #2e7d32
  successLight: [237, 252, 242] as [number, number, number],
  error: [198, 40, 40] as [number, number, number], // #c62828
  errorLight: [254, 242, 242] as [number, number, number],
  warning: [249, 168, 37] as [number, number, number], // #f9a825
  warningLight: [255, 251, 235] as [number, number, number],
  text: {
    dark: [15, 23, 42] as [number, number, number], // Slate 900
    main: [51, 65, 85] as [number, number, number], // Slate 700
    muted: [100, 116, 139] as [number, number, number], // Slate 500
    light: [148, 163, 184] as [number, number, number], // Slate 400
  },
  border: [226, 232, 240] as [number, number, number], // Slate 200
  background: [248, 250, 252] as [number, number, number], // Slate 50
  white: [255, 255, 255] as [number, number, number]
}

// --- Main Export Function ---

export async function exportAttemptToPDF(data: AttemptData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15 // Reduced margin slightly to fit design better
  let yPosition = margin

  // --- Helpers ---

  const setFont = (type: 'display' | 'body' | 'mono', weight: 'normal' | 'bold', size: number, color: [number, number, number] = colors.text.main) => {
    // Mapping rudimentary fonts since custom fonts require loading
    const fontName = type === 'mono' ? 'courier' : 'helvetica'
    pdf.setFont(fontName, weight)
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
  }

  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin - 15) { // 15mm bottom buffer for footer
      drawFooter()
      pdf.addPage()
      yPosition = margin + 10 // Top margin on new pages
      return true
    }
    return false
  }

  const drawFooter = () => {
    const pageCount = pdf.getNumberOfPages()
    pdf.setPage(pageCount)
    
    const footerY = pageHeight - 12
    
    // Line
    pdf.setDrawColor(...colors.border)
    pdf.setLineWidth(0.1)
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

    // Generated text
    setFont('body', 'normal', 8, colors.text.light)
    pdf.text(`Generado el ${format(new Date(), 'dd MMM yyyy, HH:mm', { locale: es })}`, margin, footerY)
    
    // Page number
    pdf.text(`Página ${pageCount}`, pageWidth - margin, footerY, { align: 'right' })
    
    // Copyright
    pdf.text('© Lingowow Platform', pageWidth / 2, footerY, { align: 'center' })
  }

  // --- Header Section ---

  // Logo (Simplified geometric diamond shape)
  pdf.setFillColor(...colors.primary)
  // Triangle down
  pdf.triangle(margin + 4, margin, margin, margin + 7, margin + 8, margin + 7, 'F')
  // Triangle up (smaller) to simulate diamond effect
  pdf.setFillColor(255, 255, 255)
  pdf.triangle(margin + 4, margin + 2, margin + 2, margin + 5, margin + 6, margin + 5, 'F')
  
  // Brand Name
  setFont('display', 'bold', 14, colors.text.dark)
  pdf.text('Lingowow', margin + 12, margin + 6)

  // Confidential Badge
  const confText = 'CONFIDENTIAL'
  setFont('body', 'bold', 7, colors.text.muted)
  const confWidth = pdf.getTextWidth(confText) + 8
  
  pdf.setFillColor(241, 245, 249) // Slate 100
  pdf.setDrawColor(...colors.border)
  pdf.roundedRect(pageWidth - margin - confWidth, margin, confWidth, 7, 1, 1, 'F')
  pdf.text(confText, pageWidth - margin - confWidth/2, margin + 4.5, { align: 'center' })

  yPosition += 20

  // Title
  setFont('display', 'bold', 22, colors.text.dark)
  pdf.text('Reporte de Evaluación Académica', margin, yPosition)
  yPosition += 7
  
  setFont('body', 'normal', 10, colors.text.muted)
  pdf.text('Análisis detallado de rendimiento y evaluación de habilidades.', margin, yPosition)
  yPosition += 10

  // --- Info Grid (Gray Background) ---
  
  const gridHeight = 45
  pdf.setFillColor(...colors.background)
  pdf.setDrawColor(...colors.border)
  pdf.roundedRect(margin, yPosition, pageWidth - (margin * 2), gridHeight, 2, 2, 'FD')
  
  const col1X = margin + 8
  const col2X = margin + (pageWidth - margin * 2) / 2 + 8
  const gridStartY = yPosition + 10
  
  // Column 1: Student Details
  setFont('body', 'bold', 8, colors.text.light)
  pdf.text('DETALLES DEL ESTUDIANTE', col1X, gridStartY)
  
  const drawDetailRow = (label: string, value: string, y: number, isMono = false, isPrimary = false) => {
    setFont('body', 'normal', 9, colors.text.muted)
    pdf.text(label, col1X, y)
    
    if (isMono) setFont('mono', 'normal', 9, colors.text.dark)
    else if (isPrimary) setFont('body', 'bold', 9, colors.primary)
    else setFont('body', 'bold', 9, colors.text.dark)
    
    pdf.text(value, col1X + 35, y)
  }

  drawDetailRow('Nombre', data.studentName, gridStartY + 8)
  drawDetailRow('Email', data.studentEmail, gridStartY + 16)
  
  // Column 2: Exam Details
  setFont('body', 'bold', 8, colors.text.light)
  pdf.text('DETALLES DEL EXAMEN', col2X, gridStartY)
  
  const drawExamRow = (label: string, value: string, y: number, isPrimary = false) => {
    setFont('body', 'normal', 9, colors.text.muted)
    pdf.text(label, col2X, y)
    
    if (isPrimary) setFont('body', 'bold', 9, colors.primary)
    else setFont('body', 'bold', 9, colors.text.dark)
    
    pdf.text(value, col2X + 35, y)
  }

  drawExamRow('Examen', data.examTitle, gridStartY + 8, true)
  drawExamRow('Curso', data.courseName || 'N/A', gridStartY + 16)
  drawExamRow('Fecha', data.submittedAt, gridStartY + 24)

  yPosition += gridHeight + 10

  // --- Score Mastery Bar ---
  
  const scorePercentage = data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0
  
  setFont('body', 'bold', 9, colors.text.main)
  pdf.text('SCORE MASTERY', margin, yPosition)
  
  setFont('display', 'bold', 14, colors.primary)
  pdf.text(`${scorePercentage}%`, pageWidth - margin, yPosition, { align: 'right' })
  
  yPosition += 3
  
  // Bar background
  pdf.setFillColor(...colors.border)
  pdf.roundedRect(margin, yPosition, pageWidth - (margin * 2), 3, 1.5, 1.5, 'F')
  
  // Bar fill
  if (scorePercentage > 0) {
    pdf.setFillColor(...colors.primary)
    const fillWidth = ((pageWidth - (margin * 2)) * scorePercentage) / 100
    pdf.roundedRect(margin, yPosition, fillWidth, 3, 1.5, 1.5, 'F')
  }
  
  yPosition += 15

  // --- Summary Cards ---
  
  const answerableQuestions = data.answers.filter(a => !a.isInformativeBlock)
  const correctAnswers = answerableQuestions.filter(a => a.isCorrect === true).length
  const cardWidth = (pageWidth - (margin * 2) - 10) / 3
  const cardHeight = 30
  
  const drawSummaryCard = (x: number, title: string, value: string, iconType: 'score' | 'check' | 'time') => {
    // Card Container
    pdf.setDrawColor(...colors.border)
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(x, yPosition, cardWidth, cardHeight, 3, 3, 'FD')
    
    // Icon Circle
    const circleColor = iconType === 'score' ? colors.primaryLight : iconType === 'check' ? colors.successLight : colors.warningLight
    const iconColor = iconType === 'score' ? colors.primary : iconType === 'check' ? colors.success : colors.warning
    
    pdf.setFillColor(...circleColor)
    pdf.circle(x + 12, yPosition + 11, 6, 'F')
    
    // Placeholder Icon (Simple shapes)
    pdf.setFillColor(...iconColor)
    if (iconType === 'score') {
      pdf.rect(x + 10, yPosition + 10, 1.5, 4, 'F')
      pdf.rect(x + 12.5, yPosition + 7, 1.5, 7, 'F')
    } else if (iconType === 'check') {
      pdf.text('✓', x + 10.5, yPosition + 13) // Simple text check
    } else {
      pdf.circle(x + 12, yPosition + 11, 3, 'S') // Clock face
      pdf.line(x + 12, yPosition + 11, x + 12, yPosition + 9) // Hand
      pdf.line(x + 12, yPosition + 11, x + 13.5, yPosition + 11) // Hand
    }

    // Text
    setFont('body', 'normal', 8, colors.text.muted)
    pdf.text(title, x + 24, yPosition + 10)
    
    setFont('display', 'bold', 12, colors.text.dark)
    pdf.text(value, x + 24, yPosition + 18)
  }

  drawSummaryCard(margin, 'Puntaje Total', `${data.totalScore}/${data.maxScore}`, 'score')
  drawSummaryCard(margin + cardWidth + 5, 'Respuestas', `${correctAnswers} Correctas`, 'check')
  // We don't have time tracked in this version, so we show total questions
  drawSummaryCard(margin + (cardWidth + 5) * 2, 'Total Preguntas', `${answerableQuestions.length} Items`, 'time')

  yPosition += cardHeight + 10

  // Divider
  pdf.setDrawColor(...colors.border)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // --- Detailed Analysis Title ---
  setFont('display', 'bold', 12, colors.text.dark)
  pdf.text('Análisis Detallado', margin, yPosition)
  yPosition += 10

  // --- Questions Loop ---
  
  let questionCounter = 0
  
  for (const answer of data.answers) {
    if (answer.isInformativeBlock) continue
    questionCounter++
    
    // Estimate height needed for this question block
    // Base header + question text + options + feedback
    // This is a rough estimate, but sufficient for breaks
    const estimatedHeight = 50 + (answer.multipleChoiceDetails ? answer.multipleChoiceDetails.length * 10 : 20)
    checkPageBreak(estimatedHeight)

    // Question Header
    // Number Bubble
    pdf.setFillColor(...colors.background)
    pdf.circle(margin + 5, yPosition + 2, 5, 'F')
    setFont('body', 'bold', 9, colors.text.main)
    pdf.text(questionCounter.toString(), margin + 5, yPosition + 3.5, { align: 'center' })
    
    // Question Text (Title line) - Truncated if too long for header
    const cleanQuestionText = answer.questionText.replace(/<[^>]*>/g, '').substring(0, 60) + (answer.questionText.length > 60 ? '...' : '')
    setFont('body', 'bold', 10, colors.text.dark)
    pdf.text(cleanQuestionText, margin + 14, yPosition + 3.5)
    
    // Status Badge
    const status = answer.needsReview ? 'Revisión' : (answer.isCorrect ? 'Correcta' : 'Incorrecta')
    const statusColor = answer.needsReview ? colors.warning : (answer.isCorrect ? colors.success : colors.error)
    const statusBg = answer.needsReview ? colors.warningLight : (answer.isCorrect ? colors.successLight : colors.errorLight)
    
    // Category Badge (Left of status)
    if (answer.category) {
      const catText = answer.category.toUpperCase()
      setFont('body', 'bold', 7, colors.text.muted)
      const catWidth = pdf.getTextWidth(catText) + 6
      const catX = pageWidth - margin - 30 - catWidth
      
      pdf.setFillColor(...colors.background)
      pdf.roundedRect(catX, yPosition - 2, catWidth, 6, 1, 1, 'F')
      pdf.text(catText, catX + 3, yPosition + 2)
    }

    // Status Badge Drawing
    setFont('body', 'bold', 7, statusColor)
    const statusWidth = pdf.getTextWidth(status) + 12
    const statusX = pageWidth - margin - statusWidth
    
    pdf.setFillColor(...statusBg)
    pdf.setDrawColor(...statusColor) // Optional border
    pdf.roundedRect(statusX, yPosition - 2, statusWidth, 6, 3, 3, 'F')
    
    // Icon inside badge
    const iconChar = answer.needsReview ? '?' : (answer.isCorrect ? '✓' : '✗')
    pdf.text(`${iconChar} ${status}`, statusX + 3, yPosition + 2)

    yPosition += 10
    
    // We will draw the box background later or per section to manage flow?
    // Let's just draw content and advanced spacing
    
    // Full Question Text
    setFont('body', 'normal', 10, colors.text.main)
    const qLines = pdf.splitTextToSize(answer.questionText.replace(/<[^>]*>/g, ''), pageWidth - (margin * 2) - 10)
    pdf.text(qLines, margin + 5, yPosition)
    yPosition += (qLines.length * 5) + 5
    
    // Answers Area
    
    if (answer.multipleChoiceDetails && answer.multipleChoiceDetails.length > 0) {
      // Multiple Choice breakdown
      answer.multipleChoiceDetails.forEach((detail, idx) => {
        checkPageBreak(15)
        
        // Option Box
        const isUserSelected = detail.userOptionLetter !== null
        const isItemCorrect = detail.isCorrect
        
        // Box Style
        let boxColor = colors.white
        let borderColor = colors.border
        
        if (isUserSelected) {
             if (isItemCorrect) {
                 boxColor = colors.successLight
                 borderColor = colors.success
             } else {
                 boxColor = colors.errorLight
                 borderColor = colors.error
             }
        }
        
        // Correct answer highlight if user missed it?
        // For simplicity, let's follow the provided design:
        // Show User Answer row
        // Show Correct Answer row (if different)
        
        // Item Question Subtitle
        setFont('body', 'bold', 9, colors.text.dark)
        pdf.text(`${idx + 1}. ${detail.itemQuestion}`, margin + 5, yPosition)
        yPosition += 6
        
        // User Answer Row
        pdf.setFillColor(...boxColor)
        pdf.setDrawColor(...borderColor)
        pdf.roundedRect(margin + 5, yPosition, pageWidth - (margin * 2) - 10, 10, 1.5, 1.5, 'FD')
        
        // Radio Circle
        pdf.setDrawColor(...(isUserSelected ? borderColor : colors.border))
        pdf.setFillColor(...(isUserSelected ? borderColor : colors.white)) // Filled if selected
        pdf.circle(margin + 10, yPosition + 5, 2.5, 'FD')
        
        setFont('body', 'normal', 9, colors.text.dark)
        const userText = detail.userOptionText || '(Sin respuesta)'
        pdf.text(userText, margin + 18, yPosition + 6.5)
        
        if (isUserSelected) {
            setFont('body', 'bold', 7, isItemCorrect ? colors.success : colors.error)
            pdf.text(isItemCorrect ? '(CORRECTO)' : '(TU RESPUESTA)', pageWidth - margin - 25, yPosition + 6.5)
        }
        
        yPosition += 12
        
        // If incorrect, show correct one below
        if (!detail.isCorrect) {
            pdf.setFillColor(...colors.successLight)
            pdf.setDrawColor(...colors.success)
            pdf.roundedRect(margin + 5, yPosition, pageWidth - (margin * 2) - 10, 10, 1.5, 1.5, 'FD')
            
             // Green Circle
            pdf.setDrawColor(...colors.success)
            pdf.circle(margin + 10, yPosition + 5, 2.5, 'S')
            
            setFont('body', 'normal', 9, colors.text.dark)
            pdf.text(detail.correctOptionText, margin + 18, yPosition + 6.5)
            
            setFont('body', 'bold', 7, colors.success)
            pdf.text('(RESPUESTA CORRECTA)', pageWidth - margin - 35, yPosition + 6.5)
            
            yPosition += 12
        }
        
        yPosition += 2
      })
      
    } else {
      // Simple Answer or Essay
      checkPageBreak(25)
      
      const isCorrect = answer.isCorrect === true
      const needsReview = answer.needsReview
      
      let boxColor = colors.white
      let borderColor = colors.border
      
      if (!needsReview) {
          boxColor = isCorrect ? colors.successLight : colors.errorLight
          borderColor = isCorrect ? colors.success : colors.error
      } else {
          boxColor = colors.warningLight
          borderColor = colors.warning
      }

      // User Answer Box
      pdf.setFillColor(...boxColor)
      pdf.setDrawColor(...borderColor)
      
      // Calculate height for text
      const userAnsText = answer.userAudioUrl ? '🎤 Grabación de audio enviada' : (answer.userAnswer || '(Sin respuesta)')
      const textLines = pdf.splitTextToSize(userAnsText, pageWidth - (margin * 2) - 30)
      const boxH = Math.max(12, (textLines.length * 5) + 6)
      
      pdf.roundedRect(margin + 5, yPosition, pageWidth - (margin * 2) - 10, boxH, 1.5, 1.5, 'FD')
      
      // Icon
      // Radio like circle
      pdf.setDrawColor(...borderColor)
      pdf.setFillColor(...borderColor) 
      pdf.circle(margin + 10, yPosition + 6, 2.5, needsReview ? 'S' : 'FD') // Filled if graded
      
      setFont('body', 'normal', 9, colors.text.dark)
      pdf.text(textLines, margin + 18, yPosition + 6.5)
      
      // Label
      setFont('body', 'bold', 7, needsReview ? colors.warning : (isCorrect ? colors.success : colors.error))
      const label = needsReview ? '(TU RESPUESTA)' : (isCorrect ? '(CORRECTO)' : '(TU RESPUESTA)')
      pdf.text(label, pageWidth - margin - 30, yPosition + 6.5)
      
      yPosition += boxH + 2
      
      // Show correct answer if incorrect and available
      if (!isCorrect && !needsReview && answer.correctAnswer) {
          pdf.setFillColor(...colors.successLight)
          pdf.setDrawColor(...colors.success)
          
          const corrText = answer.correctAnswer
          const corrLines = pdf.splitTextToSize(corrText, pageWidth - (margin * 2) - 30)
          const corrH = Math.max(12, (corrLines.length * 5) + 6)
          
          pdf.roundedRect(margin + 5, yPosition, pageWidth - (margin * 2) - 10, corrH, 1.5, 1.5, 'FD')
          
          pdf.setDrawColor(...colors.success)
          pdf.circle(margin + 10, yPosition + 6, 2.5, 'S')
          
          setFont('body', 'normal', 9, colors.text.dark)
          pdf.text(corrLines, margin + 18, yPosition + 6.5)
          
          setFont('body', 'bold', 7, colors.success)
          pdf.text('(RESPUESTA CORRECTA)', pageWidth - margin - 35, yPosition + 6.5)
          
          yPosition += corrH + 2
      }
    }
    
    // Feedback Section
    if (answer.feedback) {
        checkPageBreak(20)
        yPosition += 2
        
        pdf.setFillColor(...colors.primaryLight)
        pdf.setDrawColor(...colors.primary)
        // Left border bar style
        pdf.rect(margin + 5, yPosition, 1, 15, 'F')
        
        setFont('body', 'bold', 9, colors.primary)
        pdf.text('Feedback del Profesor:', margin + 8, yPosition + 4)
        
        setFont('body', 'normal', 9, colors.text.main)
        const feedLines = pdf.splitTextToSize(answer.feedback, pageWidth - margin - 20)
        pdf.text(feedLines, margin + 8, yPosition + 9)
        
        yPosition += (feedLines.length * 5) + 10
    }

    yPosition += 8 // Spacing between questions
  }

  // Draw footer on last page
  drawFooter()

  // Abrir en nueva pestaña en lugar de descargar
  const pdfDataUri = pdf.output('datauristring')
  window.open(pdfDataUri, '_blank')
}
