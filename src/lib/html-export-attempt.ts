import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AttemptData, QuestionAnswer } from '@/types/exam'
import { LINGOWOW_LOGO_BASE64 } from '@/lib/logo-base64'

// Función para truncar texto a 100 caracteres manteniendo HTML
function truncateToTwoLines(text: string): string {
  if (!text) return text

  // Si no tiene HTML, truncar directamente
  if (!text.includes('<')) {
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }

  // Contar caracteres de texto visible (sin etiquetas HTML)
  let visibleChars = 0
  let result = ''
  let inTag = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '<') {
      inTag = true
      result += char
    } else if (char === '>') {
      inTag = false
      result += char
    } else if (inTag) {
      result += char
    } else {
      // Es un carácter visible
      if (visibleChars < 100) {
        result += char
        visibleChars++
      } else if (visibleChars === 100) {
        result += '...'
        visibleChars++
        break
      }
    }
  }

  // Cerrar etiquetas abiertas si es necesario
  const openTags = result.match(/<(\w+)[^>]*>/g) || []
  const closeTags = result.match(/<\/(\w+)>/g) || []

  // Contar etiquetas abiertas vs cerradas
  const tagStack: string[] = []
  for (const tag of openTags) {
    const tagName = tag.match(/<(\w+)/)?.[1]
    if (tagName && !['br', 'hr', 'img', 'input'].includes(tagName.toLowerCase())) {
      tagStack.push(tagName)
    }
  }
  for (const tag of closeTags) {
    const tagName = tag.match(/<\/(\w+)/)?.[1]
    if (tagName) {
      const idx = tagStack.lastIndexOf(tagName)
      if (idx !== -1) tagStack.splice(idx, 1)
    }
  }

  // Cerrar etiquetas pendientes
  while (tagStack.length > 0) {
    result += `</${tagStack.pop()}>`
  }

  return result
}

export async function exportAttemptToHTML(data: AttemptData): Promise<void> {
  // Generar código de verificación si no existe (fallback para datos existentes)
  const verificationCode =
    data.verificationCode ||
    (() => {
      const hash = data.attemptId.slice(-6).toUpperCase()
      return `LW-EXAM-${hash}`
    })()

  // Manejo robusto de fecha con fallback
  let submittedDate: Date

  try {
    if (data.submittedAt && data.submittedAt !== 'N/A') {
      // Intentar parsing directo primero
      submittedDate = new Date(data.submittedAt)

      // Si es inválido, intentar con formatos en español
      if (isNaN(submittedDate.getTime())) {
        // Formato: "23 ene, 19:08" -> "2024-01-23T19:08:00"
        const spanishMonths = [
          'ene',
          'feb',
          'mar',
          'abr',
          'may',
          'jun',
          'jul',
          'ago',
          'sep',
          'oct',
          'nov',
          'dic',
        ]
        const match = data.submittedAt.match(/(\d+)\s+(\w+),\s+(\d+):(\d+)/)

        if (match) {
          const [, day, monthStr, hour, minute] = match
          const monthIndex = spanishMonths.indexOf(monthStr.toLowerCase())
          const currentYear = new Date().getFullYear()

          if (monthIndex !== -1) {
            submittedDate = new Date(
              currentYear,
              monthIndex,
              parseInt(day),
              parseInt(hour),
              parseInt(minute)
            )
          }
        }

        // Si sigue siendo inválido, usar fecha actual
        if (isNaN(submittedDate.getTime())) {
          console.warn('Invalid submittedAt date, using current date:', data.submittedAt)
          submittedDate = new Date()
        }
      }
    } else {
      submittedDate = new Date()
    }
  } catch (error) {
    console.warn('Error parsing date, using current date:', error)
    submittedDate = new Date()
  }

  const formattedDate = format(submittedDate, 'MMM dd, yyyy', { locale: es })
  const formattedTime = format(submittedDate, 'h:mm a', { locale: es })

  // Contar respuestas correctas incluyendo crédito parcial de multiple choice
  let correctCount = 0
  data.answers.forEach((a) => {
    if (a.isInformativeBlock) return // Ignorar bloques informativos
    
    if (a.questionType === 'MULTIPLE_CHOICE' && a.multipleChoiceDetails) {
      // Para multiple choice con crédito parcial, contar cada sub-respuesta correcta
      correctCount += a.multipleChoiceDetails.filter((detail) => detail.isCorrect).length
    } else if (a.isCorrect === true) {
      // Para otros tipos de preguntas, contar si es correcta
      correctCount += 1
    }
  })
  
  const scorePercentage =
    data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0

  const generateQuestionHTML = (answer: QuestionAnswer, index: number) => {
    // Si es un bloque de audio o grabación, mostrarlo con reproductor
    const isRecordingQuestion =
      answer.questionType === 'audio' ||
      answer.questionType === 'AUDIO' ||
      answer.questionType === 'RECORDING' ||
      answer.questionType === 'Recording' ||
      answer.questionType === 'recording' ||
      answer.category === 'Audio' ||
      answer.userAudioUrl

    if (isRecordingQuestion) {
      return `
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="flex items-center justify-center size-8 rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                <span class="material-symbols-outlined text-[16px]">mic</span>
              </span>
              <h4 class="font-semibold text-slate-800">${answer.category || 'Audio'}</h4>
            </div>
            <div class="flex gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-600 text-xs font-medium border border-purple-200">Audio</span>
            </div>
          </div>
          <div class="p-6 bg-purple-50 rounded-lg border border-purple-200">
            <div class="flex flex-col gap-3">
              <p class="text-slate-800 font-medium ml-1">${answer.questionText}</p>
              
              <!-- Waveform Audio Player (Réplica exacta del componente original) -->
              <div class="bg-white border rounded-xl p-4 shadow-sm">
                <div class="flex items-center gap-4">
                  <!-- Botón Play/Pause -->
                  <button class="h-12 w-12 flex items-center justify-center rounded-full transition-all shadow-md shrink-0 bg-blue-900 text-white hover:bg-blue-800">
                    <span class="material-symbols-outlined text-[20px] fill-current ml-0.5">play_arrow</span>
                  </button>

                  <div class="flex-1 space-y-1.5">
                    <!-- Título con ícono de volumen -->
                    <div class="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <span class="material-symbols-outlined text-[16px]">volume_up</span>
                      <span>${answer.userAudioUrl ? 'Grabación de voz' : 'Instrucción de audio'}</span>
                    </div>
                    
                    <!-- Waveform -->
                    <div class="h-10 flex items-center justify-between gap-0.5 cursor-pointer">
                      ${Array.from({ length: 32 }, () => {
                        const height = Math.random() * 0.7 + 0.3
                        const isPlayed = false // Simulado como no reproducido
                        return `
                          <div class="w-1 rounded-full transition-colors duration-200 ${
                            isPlayed ? 'bg-blue-600' : 'bg-slate-300/30'
                          }" style="height: ${height * 100}%; min-height: 20%"></div>
                        `
                      }).join('')}
                    </div>

                    <!-- Tiempo -->
                    <div class="flex justify-between text-xs font-medium text-slate-500">
                      <span>0:00</span>
                      <span>0:45</span>
                    </div>
                  </div>
                </div>
              </div>
              
              ${
                answer.feedback
                  ? `
                <div class="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p class="text-sm text-purple-800"><strong>Retroalimentación del Profesor:</strong> ${answer.feedback}</p>
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      `
    }

    // Lógica mejorada para detectar tipos de bloques basada en los logs reales
    const isTitleBlock = answer.questionType === 'title'

    const isTextBlock = answer.questionType === 'text' && answer.isInformativeBlock

    if (isTitleBlock) {
      return `
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="flex items-center justify-center size-8 rounded-full bg-primary-100 text-primary-600 font-bold text-sm">
                <span class="material-symbols-outlined text-[16px]">title</span>
              </span>
              <h4 class="font-semibold text-slate-800">Título</h4>
            </div>
            <div class="flex gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-600 text-xs font-medium border border-primary-200">Título</span>
            </div>
          </div>
          <div class="p-6 bg-primary-50 rounded-lg border border-primary-200">
            <div class="flex flex-col gap-2">
              <h2 class="text-2xl font-bold text-slate-900 border-b-2 border-primary pb-2">${answer.questionText}</h2>
              ${
                answer.userAnswer
                  ? `
                <div class="p-3 bg-white rounded-lg border border-primary/20">
                  <p class="text-sm text-primary/80">${truncateToTwoLines(answer.userAnswer)}</p>
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      `
    } else if (isTextBlock) {
      const truncatedText = truncateToTwoLines(answer.questionText)

      return `
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="flex items-center justify-center size-8 rounded-full bg-amber-100 text-amber-600 font-bold text-sm">
                <span class="material-symbols-outlined text-[16px]">text_snippet</span>
              </span>
              <h4 class="font-semibold text-slate-800">Texto</h4>
            </div>
            <div class="flex gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-600 text-xs font-medium border border-amber-200">Texto</span>
            </div>
          </div>
          <div class="p-6 bg-amber-50 rounded-lg border border-amber-200">
            <div class="flex flex-col gap-3">
              <p class="text-slate-800 font-medium ml-1">${truncatedText}</p>
              ${
                answer.userAnswer
                  ? `
                <div class="p-4 bg-white rounded-lg border border-amber-100">
                  <p class="text-sm text-slate-600">${truncateToTwoLines(answer.userAnswer)}</p>
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      `
    }

    // Si es un bloque informativo (no audio), mostrarlo con estilo diferenciado
    if (answer.isInformativeBlock) {
      return `
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="flex items-center justify-center size-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                <span class="material-symbols-outlined text-[16px]">info</span>
              </span>
              <h4 class="font-semibold text-slate-800">${answer.category || 'Información'}</h4>
            </div>
            <div class="flex gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-medium border border-blue-200">Información</span>
            </div>
          </div>
          <div class="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <div class="flex flex-col gap-3">
              <p class="text-slate-800 font-medium ml-1">${truncateToTwoLines(answer.questionText)}</p>
              ${
                answer.userAnswer
                  ? `
                <div class="p-4 bg-white rounded-lg border border-blue-100">
                  <p class="text-sm text-slate-600">${answer.userAnswer}</p>
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      `
    }

    let questionContent = ''

    if (answer.questionType === 'MULTIPLE_CHOICE' && answer.multipleChoiceDetails) {
      questionContent = `
        <div class="flex flex-col gap-3">
          <p class="text-slate-800 font-medium ml-1">${truncateToTwoLines(answer.questionText)}</p>
          <div class="flex flex-col gap-2 mt-2">
            ${answer.multipleChoiceDetails
              .map((detail) => {
                // Determinar el estado de CADA opción individualmente
                let optionIcon = ''
                let optionColor = ''

                if (detail.isCorrect) {
                  optionIcon = 'check'
                  optionColor = 'success'
                } else if (detail.userOptionLetter) {
                  optionIcon = 'close'
                  optionColor = 'error'
                } else {
                  optionIcon = ''
                  optionColor = ''
                }

                return `
              <div class="flex items-center justify-between p-3 rounded ${
                detail.isCorrect
                  ? 'bg-success/5 border border-success text-slate-800'
                  : detail.userOptionLetter
                    ? 'bg-error/5 border border-error text-slate-800'
                    : 'bg-white border border-slate-200 text-slate-500 opacity-60'
              }">
                <div class="flex items-start">
                  <div class="size-5 rounded-full flex-shrink-0 mt-0.5 ${
                    detail.isCorrect
                      ? 'border border-success'
                      : detail.userOptionLetter
                        ? 'border-2 border-error flex items-center justify-center'
                        : 'border border-slate-300'
                  } mr-3">
                    ${detail.userOptionLetter && !detail.isCorrect ? '<div class="size-2.5 rounded-full bg-error"></div>' : ''}
                  </div>
                  <div class="flex-1">
                    <span class="font-medium">${detail.userOptionText || detail.correctOptionText}</span>
                    ${detail.userOptionLetter && !detail.isCorrect ? '<span class="ml-2 text-xs font-bold text-error uppercase tracking-wide block">(Tu Respuesta)</span>' : ''}
                    ${detail.isCorrect ? '<span class="ml-2 text-xs font-bold text-success uppercase tracking-wide block">(Respuesta Correcta)</span>' : ''}
                  </div>
                </div>
                ${optionIcon ? `<span class="material-symbols-outlined text-${optionColor}">${optionIcon}</span>` : ''}
              </div>
            `
              })
              .join('')}
          </div>
        </div>
      `
    } else if (
      answer.questionType === 'RECORDING' ||
      answer.questionType === 'Recording' ||
      answer.questionType === 'AUDIO' ||
      answer.category === 'Audio' ||
      answer.userAudioUrl
    ) {
      questionContent = `
        <div class="flex flex-col gap-3">
          <p class="text-slate-800 font-medium ml-1">${truncateToTwoLines(answer.questionText)}</p>
          <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <!-- Audio Player Visual -->
            <div class="bg-white rounded-lg border border-slate-200 p-4">
              <!-- Player Controls -->
              <div class="flex items-center gap-3 mb-3">
                <div class="size-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <span class="material-symbols-outlined text-white text-xl">play_arrow</span>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-500">0:00</span>
                    <div class="flex-1 h-1 bg-slate-200 rounded-full">
                      <div class="w-0 h-1 bg-blue-500 rounded-full"></div>
                    </div>
                    <span class="text-xs text-slate-500">0:45</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-slate-400">volume_up</span>
                  <div class="w-16 h-1 bg-slate-200 rounded-full">
                    <div class="w-12 h-1 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <!-- Espectrograma Visual -->
              <div class="h-20 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-2 relative overflow-hidden">
                <div class="absolute inset-0 flex items-center justify-center">
                  <!-- Barras de espectro simuladas -->
                  <div class="flex items-end gap-1 h-full">
                    ${Array.from({ length: 40 }, (_, i) => {
                      const height = Math.random() * 60 + 20
                      const blues = ['bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600']
                      const color = blues[i % blues.length]
                      return `<div class="w-1 ${color} rounded-t" style="height: ${height}%"></div>`
                    }).join('')}
                  </div>
                </div>
                <!-- Overlay con info -->
                <div class="absolute inset-0 flex items-center justify-center bg-black/5">
                  <div class="text-center">
                    <span class="material-symbols-outlined text-slate-400 text-2xl">graphic_eq</span>
                    <p class="text-xs text-slate-500 mt-1">Audio Recording</p>
                  </div>
                </div>
              </div>
              
              <!-- Audio Info -->
              <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-slate-400 text-sm">mic</span>
                  <span class="text-xs text-slate-500">${answer.userAudioUrl ? 'Voice recording' : 'No recording available'}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-slate-400 text-sm">schedule</span>
                  <span class="text-xs text-slate-500">0:45</span>
                </div>
              </div>
            </div>
          </div>
          ${
            answer.feedback
              ? `
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p class="text-sm text-blue-800"><strong>Retroalimentación del Profesor:</strong> ${answer.feedback}</p>
            </div>
          `
              : ''
          }
        </div>
      `
    }

    const questionNumber = index + 1
    const isCorrect = answer.isCorrect === true
    const statusColor = isCorrect ? 'success' : 'error'
    const statusIcon = isCorrect ? 'check' : 'close'
    const statusText = isCorrect ? 'Correcto' : 'Incorrecto'

    return `
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="flex items-center justify-center size-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm">${questionNumber}</span>
            <h4 class="font-semibold text-slate-800">${answer.category || 'Pregunta'}</h4>
          </div>
          <div class="flex gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">${answer.category || 'General'}</span>
            <span class="px-2.5 py-0.5 rounded-full bg-${statusColor}/10 text-${statusColor} text-xs font-medium border border-${statusColor}/20 flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">${statusIcon}</span> ${statusText}
            </span>
          </div>
        </div>
        <div class="p-6 bg-slate-50 rounded-lg border border-slate-200">
          ${questionContent}
        </div>
      </div>
    `
  }

  const htmlContent = `<!DOCTYPE html>
<html class="light" lang="en">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <title>Reporte de Evaluación Académica</title>
  <!-- Material Symbols -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <!-- Google Fonts: Lexend -->
  <link href="https://fonts.googleapis.com" rel="preconnect"/>
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <!-- Theme Configuration -->
  <script id="tailwind-config">
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            "primary": "#137fec",
            "background-light": "#f6f7f8",
            "background-dark": "#101922",
            "success": "#2e7d32",
            "error": "#c62828",
            "warning": "#f9a825",
            "surface": "#ffffff",
          },
          fontFamily: {
            "display": ["Lexend", "sans-serif"]
          },
          borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
          boxShadow: {
            "elevation-1": "0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)",
            "paper": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 4px rgba(0,0,0,0.1)"
          }
        },
      },
    }
  </script>
</head>
<body class="bg-background-light dark:bg-background-dark min-h-screen font-display text-slate-800 p-6 md:p-10 flex justify-center items-start overflow-y-auto">
  <!-- PDF Page Container (A4 Ratio approx) -->
  <div class="bg-surface w-full max-w-[850px] min-h-[1100px] shadow-paper rounded-sm p-10 md:p-12 relative flex flex-col gap-8 mx-auto">
    <!-- Header Section -->
    <header class="flex flex-col gap-6 border-b border-slate-200 pb-6">
      <!-- Top Bar: Logo & Brand -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 text-slate-900">
          <div class="w-16 h-16">
            <img src="${LINGOWOW_LOGO_BASE64}" alt="Lingowow Logo" class="w-full h-full object-contain" />
          </div>
          <h2 class="text-xl font-bold tracking-tight">Lingowow</h2>
        </div>
        <div class="flex items-center gap-2">
          <div class="px-3 py-1 bg-slate-100 rounded text-xs font-medium text-slate-500 uppercase tracking-wide">
            Confidencial
          </div>
          <button 
            id="export-pdf-btn"
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium uppercase tracking-wide transition-colors cursor-pointer print:hidden"
          >
            Exportar PDF
          </button>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Reporte de Evaluación Académica</h1>
        <p class="text-slate-500 font-medium">Análisis detallado del rendimiento y evaluación de competencias.</p>
      </div>
      <!-- Info Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-100">
        <div class="flex flex-col gap-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Detalles del Estudiante</h3>
          <div class="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
            <span class="text-slate-500">Nombre</span>
            <span class="font-semibold text-slate-900">${data.studentName}</span>
            <span class="text-slate-500">Email</span>
            <span class="font-medium text-slate-900">${data.studentEmail}</span>
            <span class="text-slate-500">ID de Intento</span>
            <span class="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 w-fit">${data.attemptId}</span>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Detalles del Examen</h3>
          <div class="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
            <span class="text-slate-500">Examen</span>
            <span class="font-semibold text-primary">${data.examTitle}</span>
            <span class="text-slate-500">Nivel</span>
            <span class="font-medium text-slate-900 flex items-center gap-2">
              Level B1
              <span class="size-2 rounded-full bg-success"></span>
            </span>
            <span class="text-slate-500">Fecha</span>
            <span class="font-medium text-slate-900">${formattedDate}</span>
          </div>
        </div>
      </div>
      <!-- Score Mastery Bar -->
      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-end">
          <span class="text-sm font-bold text-slate-700 uppercase tracking-wide">Nivel de Precisión</span>
          <span class="text-xl font-bold text-primary">${scorePercentage}%</span>
        </div>
        <div class="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-primary rounded-full" style="width: ${scorePercentage}%"></div>
        </div>
      </div>
    </header>
    
    <!-- Summary Cards Section -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Total Score Card -->
      <div class="flex flex-col p-5 bg-white rounded-xl shadow-elevation-1 border border-slate-100">
        <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <span class="material-symbols-outlined">leaderboard</span>
        </div>
        <p class="text-sm font-medium text-slate-500 mb-1">Puntuación Total</p>
        <p class="text-2xl font-bold text-slate-900">${data.totalScore}/${data.maxScore}</p>
      </div>
      <!-- Accuracy Card -->
      <div class="flex flex-col p-5 bg-white rounded-xl shadow-elevation-1 border border-slate-100">
        <div class="size-10 rounded-full bg-success/10 flex items-center justify-center text-success mb-4">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <p class="text-sm font-medium text-slate-500 mb-1">Precisión</p>
        <p class="text-2xl font-bold text-slate-900">${correctCount} Correctas</p>
      </div>
      <!-- Time Card -->
      <div class="flex flex-col p-5 bg-white rounded-xl shadow-elevation-1 border border-slate-100">
        <div class="size-10 rounded-full bg-warning/10 flex items-center justify-center text-warning mb-4">
          <span class="material-symbols-outlined">timer</span>
        </div>
        <p class="text-sm font-medium text-slate-500 mb-1">Tiempo</p>
        <p class="text-2xl font-bold text-slate-900">45 mins</p>
      </div>
    </section>
    
    <!-- Divider -->
    <div class="h-px bg-slate-200 w-full my-2"></div>
    
    <!-- Verification Section -->
    ${
      data.allowPublicVerification
        ? `
    <section class="flex flex-col gap-4">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <div class="flex items-center justify-center gap-2 mb-3">
          <span class="material-symbols-outlined text-blue-600 text-2xl">verified</span>
          <h3 class="text-lg font-bold text-blue-800">Código de Verificación</h3>
        </div>
        <div class="bg-white rounded-lg border border-blue-300 p-4 mb-3">
          <p class="text-2xl font-mono font-bold text-blue-600 tracking-wider">${verificationCode}</p>
        </div>
        <p class="text-sm text-blue-600 mb-2">Este certificado puede ser verificado electrónicamente</p>
        <p class="text-xs text-blue-500">Ingresa este código en <strong>lingowow.com/verify</strong> para confirmar la autenticidad de estos resultados</p>
      </div>
    </section>
    
    <div class="h-px bg-slate-200 w-full my-2"></div>
    `
        : ''
    }
    
    <!-- Question Sections -->
    <section class="flex flex-col gap-8">
      <h3 class="text-lg font-bold text-slate-900">Análisis Detallado</h3>
      ${data.answers.map((answer, index) => generateQuestionHTML(answer, index)).join('')}
    </section>
    
    <!-- Footer Section -->
    <footer class="mt-auto pt-8 flex flex-col gap-8 border-t border-slate-200 text-sm text-slate-500">
      <div class="flex justify-between items-end">
        <div class="flex flex-col gap-1">
          <p>Generado el ${formattedDate} a las ${formattedTime}</p>
          <p>ID del Reporte: ${verificationCode}</p>
        </div>
      </div>
      <div class="flex justify-between items-center text-xs text-slate-400">
        <p>© ${new Date().getFullYear()} Plataforma Lingowow. Todos los derechos reservados.</p>
        <p>Página 1 de 1</p>
      </div>
    </footer>
  </div>
  <script>
    // Script para exportar PDF - se ejecuta en la nueva ventana
    document.addEventListener('DOMContentLoaded', function() {
      var exportPdfBtn = document.getElementById('export-pdf-btn');
      if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async function() {
          var btn = this;
          var originalText = btn.textContent;
          
          try {
            btn.textContent = 'Generando...';
            btn.disabled = true;
            
            // Ocultar el botón temporalmente para que no aparezca en el PDF
            btn.style.display = 'none';
            
            // Obtener el HTML completo
            var html = document.documentElement.outerHTML;
            
            // Restaurar el botón
            btn.style.display = '';
            
            // Enviar al servidor con datos adicionales para el footer
            var response = await fetch('/api/generate-pdf', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                html: html,
                reportId: '${verificationCode}',
                generatedDate: '${formattedDate} a las ${formattedTime}'
              }),
            });

            if (!response.ok) {
              throw new Error('Error en el servidor al generar PDF');
            }

            // Convertir la respuesta a Blob
            var blob = await response.blob();
            
            // Crear enlace de descarga
            var url = window.URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'lingowow-report-${data.attemptId}.pdf';
            document.body.appendChild(a);
            a.click();
            
            // Limpieza
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            btn.textContent = '✓ Descargado';
            setTimeout(function() {
              btn.textContent = originalText;
              btn.disabled = false;
            }, 2000);

          } catch (error) {
            console.error('Error descargando PDF:', error);
            alert('Hubo un error generando el PDF. Usando impresión del navegador...');
            btn.textContent = originalText;
            btn.disabled = false;
            window.print();
          }
        });
      }
    });
  </script>
</body>
</html>`

  // Abrir en nueva pestaña con document.write
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(htmlContent)
    newWindow.document.close()
  }
}
