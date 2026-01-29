import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AttemptData, QuestionAnswer } from '@/types/exam'

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
  const verificationCode = data.verificationCode || (() => {
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

  const correctCount = data.answers.filter(
    (a) => a.isCorrect === true && !a.isInformativeBlock
  ).length
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
  <title>Lingowow Evaluation Report</title>
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
          <div class="size-8 text-primary">
            <svg class="w-full h-full" fill="none" viewbox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
              <path clip-rule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fill-rule="evenodd"></path>
            </svg>
          </div>
          <h2 class="text-xl font-bold tracking-tight">Lingowow</h2>
        </div>
        <div class="px-3 py-1 bg-slate-100 rounded text-xs font-medium text-slate-500 uppercase tracking-wide">
          Confidencial
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
</body>
</html>`

  // Abrir en nueva pestaña
  const htmlBlob = new Blob([htmlContent], { type: 'text/html' })
  const htmlUrl = URL.createObjectURL(htmlBlob)
  window.open(htmlUrl, '_blank')

  // Limpiar el objeto URL después de un tiempo
  setTimeout(() => URL.revokeObjectURL(htmlUrl), 1000)
}
