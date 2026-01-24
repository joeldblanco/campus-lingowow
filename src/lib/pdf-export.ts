import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ExamResultsData {
  id: string
  title: string
  description: string
  passingScore: number
  courseId: string | null
  attempts: Array<{
    id: string
    status: string
    score: number | null
    startedAt: Date
    completedAt: Date | null
    user: {
      id: string
      name: string | null
      lastName: string | null
      email: string | null
    }
  }>
  stats: {
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    passRate: number
  }
}

export async function exportExamResultsToPDF(results: ExamResultsData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = margin

  // Colores de la marca
  const primaryColor = [59, 130, 246] as [number, number, number] // blue-500
  const textGray = [107, 114, 128] as [number, number, number] // gray-500
  const successColor = [34, 197, 94] as [number, number, number] // green-500
  const errorColor = [239, 68, 68] as [number, number, number] // red-500

  // Función helper para agregar texto
  const addText = (text: string, fontSize: number, color: [number, number, number] = [0, 0, 0], x: number = margin) => {
    pdf.setFontSize(fontSize)
    pdf.setTextColor(...color)
    pdf.text(text, x, yPosition)
    yPosition += fontSize * 0.5 + 2
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
  pdf.rect(0, 0, pageWidth, 40, 'F')
  
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(24)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Reporte de Resultados', margin, 25)
  
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Lingowow - ${format(new Date(), 'dd MMMM yyyy', { locale: es })}`, margin, 32)

  yPosition = 60

  // Información del examen
  addText('Información del Examen', 18, primaryColor)
  addText(`Título: ${results.title}`, 12)
  addText(`Descripción: ${results.description}`, 12, textGray)
  addText(`Puntaje mínimo para aprobar: ${results.passingScore}%`, 12)
  addText(`Fecha de generación: ${format(new Date(), 'PPP', { locale: es })}`, 12, textGray)

  yPosition += 10

  // Estadísticas generales
  checkPageBreak(80)
  addText('Estadísticas Generales', 18, primaryColor)
  
  const statsY = yPosition
  const statsBoxHeight = 50
  const statsBoxWidth = (pageWidth - 2 * margin) / 4

  // Dibujar cajas de estadísticas
  const stats = [
    { label: 'Intentos totales', value: results.stats.totalAttempts.toString(), color: primaryColor },
    { label: 'Completados', value: results.stats.completedAttempts.toString(), color: successColor },
    { label: 'Promedio', value: `${results.stats.averageScore.toFixed(1)}%`, color: primaryColor },
    { label: 'Tasa de aprobación', value: `${results.stats.passRate.toFixed(0)}%`, color: successColor }
  ]

  stats.forEach((stat, index) => {
    const x = margin + index * statsBoxWidth
    
    // Caja
    const lightColor = stat.color.map(c => Math.floor(c * 0.1)) as [number, number, number]
    pdf.setFillColor(...lightColor)
    pdf.rect(x, statsY, statsBoxWidth - 5, statsBoxHeight, 'F')
    pdf.setDrawColor(...stat.color)
    pdf.rect(x, statsY, statsBoxWidth - 5, statsBoxHeight, 'S')
    
    // Valor
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...stat.color)
    pdf.text(stat.value, x + 10, statsY + 25)
    
    // Etiqueta
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...textGray)
    pdf.text(stat.label, x + 10, statsY + 40)
  })

  yPosition = statsY + statsBoxHeight + 20

  // Lista de intentos
  checkPageBreak(60)
  addText('Resultados por Estudiante', 18, primaryColor)
  yPosition += 5

  if (results.attempts.length === 0) {
    addText('No hay intentos registrados para este examen.', 12, textGray)
  } else {
    // Header de la tabla
    const tableHeaders = ['Estudiante', 'Email', 'Fecha', 'Estado', 'Puntaje']
    const columnWidths = [50, 60, 40, 35, 25]
    const tableY = yPosition
    
    // Dibujar header de tabla
    pdf.setFillColor(...primaryColor)
    pdf.rect(margin, tableY, pageWidth - 2 * margin, 10, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    
    let currentX = margin
    tableHeaders.forEach((header, index) => {
      pdf.text(header, currentX + 2, tableY + 7)
      currentX += columnWidths[index]
    })
    
    yPosition = tableY + 10

    // Filas de datos
    results.attempts.forEach((attempt) => {
      checkPageBreak(15)
      
      const passed = attempt.score !== null && attempt.score >= results.passingScore
      const statusColor = attempt.status === 'COMPLETED' ? (passed ? successColor : errorColor) : textGray
      
      // Alternar color de fila
      if ((results.attempts.indexOf(attempt) % 2) === 0) {
        pdf.setFillColor(249, 250, 251) // gray-50
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F')
      }
      
      // Datos de la fila
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      
      currentX = margin
      const rowData = [
        `${attempt.user.name || ''} ${attempt.user.lastName || ''}`.trim(),
        attempt.user.email || '',
        format(new Date(attempt.startedAt), 'dd/MM/yyyy'),
        attempt.status === 'IN_PROGRESS' ? 'En progreso' :
        attempt.status === 'SUBMITTED' ? 'Pendiente' :
        attempt.status === 'COMPLETED' ? (passed ? 'Aprobado' : 'No aprobado') : attempt.status,
        attempt.score ? `${attempt.score.toFixed(1)}%` : 'N/A'
      ]
      
      rowData.forEach((data, index) => {
        if (index === 3) { // Estado
          pdf.setTextColor(...statusColor)
        } else if (index === 4) { // Puntaje
          pdf.setTextColor(...(passed ? successColor : errorColor))
        } else {
          pdf.setTextColor(0, 0, 0)
        }
        
        // Truncar texto si es muy largo
        const maxWidth = columnWidths[index] - 4
        let displayText = data
        if (pdf.getTextWidth(displayText) > maxWidth) {
          while (pdf.getTextWidth(displayText + '...') > maxWidth && displayText.length > 0) {
            displayText = displayText.slice(0, -1)
          }
          displayText += '...'
        }
        
        pdf.text(displayText, currentX + 2, yPosition + 8)
        currentX += columnWidths[index]
      })
      
      yPosition += 12
    })
  }

  // Footer
  const footerY = pageHeight - 15
  pdf.setTextColor(...textGray)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Página 1 de 1', pageWidth - margin - 20, footerY)
  pdf.text('Generado por Lingowow - Plataforma de Aprendizaje de Idiomas', margin, footerY)

  // Descargar el PDF
  const fileName = `resultados-${results.title.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
  pdf.save(fileName)
}

export async function exportElementToPDF(elementId: string, fileName: string): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`)
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff'
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  
  const imgWidth = 210
  const pageHeight = 297
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(fileName)
}
