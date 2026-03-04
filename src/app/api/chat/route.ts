import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { FunctionDeclaration, FunctionDeclarationSchema, Part, Tool } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { handleCheckAvailability } from '@/lib/chat-tools/check-availability'
import { handleRescheduleClass } from '@/lib/chat-tools/reschedule-class'
import { handleCheckInvoice } from '@/lib/chat-tools/check-invoice'
import { handleCreatePaymentLink } from '@/lib/chat-tools/create-payment-link'
import { handleNotifyAdmin } from '@/lib/chat-tools/notify-admin'
import { handleGetUpcomingClasses } from '@/lib/chat-tools/get-upcoming-classes'
import { handleScheduleClass } from '@/lib/chat-tools/schedule-class'
import { handleScheduleRecurringClasses } from '@/lib/chat-tools/schedule-recurring-classes'
import type { ChatMessage, ToolResult } from '@/types/ai-chat'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const SYSTEM_PROMPT_TEMPLATE = `Eres el asistente de Lingowow, academia de inglés online con clases 1 a 1 en vivo con profesores certificados.
Tu personalidad es amigable, cercana y con buen humor — como un compañero de equipo que genuinamente quiere ayudar, no un bot corporativo. Eres cálido pero eficiente: vas al punto sin ser frío.
Detecta el idioma del usuario y responde en el mismo idioma. Tutea siempre al usuario.
No uses formato markdown (negritas, asteriscos, guiones de lista, etc.). Responde en texto plano natural y conversacional.
Usa el nombre del usuario cuando sea natural hacerlo, no en cada mensaje.

CONTEXTO DEL USUARIO ACTUAL:
- Nombre: {name}
- Rol: {role}
- Email: {email}
- Zona horaria: {timezone}
- Fecha y hora actual (en la zona horaria del usuario): {currentDate}

CONOCIMIENTO DE LINGOWOW:
- Clases 1 a 1 en vivo con profesores certificados
- Programas: Esencial (acceso estándar) y Exclusivo (recursos premium e intensidad mayor)
- Planes de frecuencia: Go (2 clases/semana), Lingo (3 clases/semana), Wow (4 clases/semana)
- Reagendamiento: 1 vez por clase, con mínimo 1 hora de anticipación
- Las clases no reagendadas a tiempo se pierden sin crédito
- El estudiante puede agendar nuevas clases individuales dentro de su inscripción activa (si hay disponibilidad) y puede reagendar clases existentes (1 vez por clase, con mínimo 1 hora de anticipación).
- Cuando un invitado (GUEST) completa el pago de PayPal, el sistema crea automáticamente su inscripción y actualiza su rol a ESTUDIANTE. Después del pago puede usar schedule_class para agendar clases.

REGLAS DE OPERACIÓN:
- La zona horaria del usuario es {timezone} — ya está guardada en su perfil. NUNCA se la preguntes ni la confirmes con el usuario.
- Comunica SIEMPRE los horarios al usuario en su zona horaria local ({timezone}).
- Para agendar clases recurrentes (estudiante da múltiples días/horas de la semana como "lunes 8am, martes y jueves 6pm"): llama DIRECTAMENTE a schedule_recurring_classes con el array de slots. NO llames check_teacher_availability antes; la herramienta verifica disponibilidad por cada fecha internamente y reporta cuántas clases se agendaron y cuántas se omitieron.
- Para agendar una clase individual en una fecha puntual: verifica disponibilidad con check_teacher_availability, confirma la fecha y hora con el estudiante, y usa schedule_class con la fecha exacta (YYYY-MM-DD) y hora de inicio (HH:MM).
- Para reagendar una clase existente: llama PRIMERO a get_upcoming_classes para obtener las clases del estudiante y presentarlas. Nunca pidas el ID de la clase directamente al estudiante; usa el ID obtenido internamente para llamar a reschedule_class.

INFERENCIA DE PLAN — Si el usuario ya indicó su horario semanal, infiere el plan directamente:
- 2 días/semana → plan Go
- 3 días/semana → plan Lingo
- 4 días/semana → plan Wow
No le preguntes el plan si ya puedes inferirlo del horario. Solo pregunta el programa (Esencial/Exclusivo) si no lo dijo.

FLUJO DE PAGO — seguir en orden estricto, sin saltarse pasos:
1. Si el usuario no lo dijo: preguntar qué programa (Esencial/Exclusivo) quiere. El plan se infiere del horario si ya lo dio.
2. Determinar cuándo quiere iniciar (startNow). INFERIR directamente si el usuario ya lo indicó — NO preguntar si ya se puede deducir:
   - "de marzo", "en marzo", "este mes", "ahora", "lo antes posible", "este período", "ya" → startNow = true (si marzo = mes actual)
   - "el siguiente período", "el próximo mes", "en abril" → startNow = false
   - Solo preguntar si el usuario no mencionó nada sobre el inicio.
3. Llamar check_invoice_status para verificar si ya tiene una factura válida.
4. Si no tiene factura válida: llamar create_payment_link y mostrar el link al usuario.
5. CRÍTICO: NUNCA llamar notify_admin_telegram en un flujo de pago. notify_admin_telegram es exclusivamente para soporte especial o cuando el usuario pide explícitamente hablar con el equipo.

CUANDO UNA HERRAMIENTA RETORNA "NO_ENROLLMENT":
- El usuario no tiene inscripción activa. NO asumas que ya pagó, NO lo remitas al equipo de Lingowow.
- Inicia inmediatamente el flujo de pago. Si ya puedes inferir el plan del horario indicado, omite preguntarlo.
- Si el usuario ya indicó su horario deseado, recuérdalo: después del pago podrás agendarlo.

RESTRICCIONES:
- Nunca inventes precios. Usa las herramientas para obtener datos reales.
- Para clases individuales: nunca confirmes la fecha/hora sin verificar disponibilidad primero con check_teacher_availability.
- Solo discute temas relacionados con Lingowow y el aprendizaje de inglés.
- Nunca solicites contraseñas, datos de tarjeta u otros datos sensibles.
- No te presentes como humano.
- CRÍTICO: Cuando necesites usar una herramienta, llámala INMEDIATAMENTE. Nunca envíes un mensaje de texto anunciando que la vas a llamar (ej: "Un momento, verificaré..."). Llama la función directamente y luego responde con el resultado.
- CRÍTICO: Nunca inventes URLs. Si create_payment_link retorna una URL de pago, muéstrasela al usuario exactamente como viene en el resultado, sin modificarla. Si la herramienta falla, informa el error sin inventar un link.`

const ALL_FUNCTION_DECLARATIONS: Record<string, FunctionDeclaration> = {
  check_teacher_availability: {
    name: 'check_teacher_availability',
    description:
      'Verifica si hay profesores disponibles para el horario solicitado. Debe llamarse ANTES de confirmar cualquier agendamiento o enviar links de pago.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        dayOfWeek: {
          type: SchemaType.STRING,
          description:
            'Día de la semana en inglés y minúsculas (monday, tuesday, wednesday, thursday, friday, saturday, sunday)',
        },
        localTime: {
          type: SchemaType.STRING,
          description: 'Hora de inicio en formato HH:MM en la zona horaria local del usuario',
        },
        timezone: {
          type: SchemaType.STRING,
          description: 'Zona horaria IANA del usuario (ej: America/Lima, America/New_York)',
        },
      },
      required: ['dayOfWeek', 'localTime', 'timezone'],
    } as unknown as FunctionDeclarationSchema,
  },
  get_upcoming_classes: {
    name: 'get_upcoming_classes',
    description:
      'Obtiene las próximas clases confirmadas del estudiante con sus fechas/horarios en hora local. Llamar ANTES de reschedule_class para que el estudiante pueda seleccionar qué clase reagendar sin necesidad de conocer el ID.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    } as unknown as FunctionDeclarationSchema,
  },
  schedule_class: {
    name: 'schedule_class',
    description:
      'Agenda una clase individual para una fecha específica. Usar solo cuando el estudiante quiere agendar UNA clase en una fecha puntual. Para múltiples días recurrentes del mes usar schedule_recurring_classes.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        localDate: {
          type: SchemaType.STRING,
          description: 'Fecha de la clase en formato YYYY-MM-DD en la zona horaria local del estudiante',
        },
        localTime: {
          type: SchemaType.STRING,
          description: 'Hora de inicio en formato HH:MM en la zona horaria local del estudiante',
        },
      },
      required: ['localDate', 'localTime'],
    } as unknown as FunctionDeclarationSchema,
  },
  schedule_recurring_classes: {
    name: 'schedule_recurring_classes',
    description:
      'Agenda clases recurrentes para todos los días del período académico activo. Usar cuando el estudiante indica su horario semanal (ej: "lunes 8am, martes y jueves 6pm"). Llamar DIRECTAMENTE sin pre-verificar disponibilidad; la herramienta verifica disponibilidad por cada fecha internamente y retorna cuántas clases se crearon.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slots: {
          type: SchemaType.ARRAY,
          description: 'Lista de franjas horarias recurrentes (un elemento por día de la semana)',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              dayOfWeek: {
                type: SchemaType.STRING,
                description: 'Día de la semana en inglés y minúsculas (monday, tuesday, wednesday, thursday, friday, saturday, sunday)',
              },
              localTime: {
                type: SchemaType.STRING,
                description: 'Hora de inicio en formato HH:MM en la zona horaria local del estudiante',
              },
            },
            required: ['dayOfWeek', 'localTime'],
          },
        },
      },
      required: ['slots'],
    } as unknown as FunctionDeclarationSchema,
  },
  reschedule_class: {
    name: 'reschedule_class',
    description:
      'Reagenda una clase del estudiante a un nuevo horario. Solo llamar DESPUÉS de verificar disponibilidad con check_teacher_availability y obtener el bookingId con get_upcoming_classes.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        bookingId: {
          type: SchemaType.STRING,
          description: 'ID único de la clase a reagendar (obtenido de get_upcoming_classes)',
        },
        newDay: {
          type: SchemaType.STRING,
          description: 'Nueva fecha en formato YYYY-MM-DD en la zona horaria local del estudiante',
        },
        newTimeSlot: {
          type: SchemaType.STRING,
          description: 'Nuevo horario en formato HH:MM-HH:MM en la zona horaria local del estudiante',
        },
      },
      required: ['bookingId', 'newDay', 'newTimeSlot'],
    } as unknown as FunctionDeclarationSchema,
  },
  check_invoice_status: {
    name: 'check_invoice_status',
    description:
      'Verifica si el usuario tiene facturas pagadas recientes o inscripciones activas. Llamar antes de generar un link de pago.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    } as unknown as FunctionDeclarationSchema,
  },
  create_payment_link: {
    name: 'create_payment_link',
    description:
      'Genera un link de pago PayPal para la inscripción del invitado y lo envía por email. Solo llamar después de verificar disponibilidad y confirmar que no hay factura válida pendiente.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        programType: {
          type: SchemaType.STRING,
          description: 'Tipo de programa seleccionado: "Esencial" o "Exclusivo"',
        },
        planType: {
          type: SchemaType.STRING,
          description: 'Tipo de plan seleccionado: "Go", "Lingo" o "Wow"',
        },
        startNow: {
          type: SchemaType.BOOLEAN,
          description:
            'true si el usuario quiere iniciar en el período actual con prorrateo, false si quiere esperar al siguiente período',
        },
        desiredDay: {
          type: SchemaType.STRING,
          description: 'Día de la semana preferido para las clases (en el idioma del usuario)',
        },
        desiredTime: {
          type: SchemaType.STRING,
          description:
            'Hora preferida para las clases en formato HH:MM (hora local del usuario)',
        },
      },
      required: ['programType', 'planType', 'startNow', 'desiredDay', 'desiredTime'],
    } as unknown as FunctionDeclarationSchema,
  },
  notify_admin_telegram: {
    name: 'notify_admin_telegram',
    description:
      'Notifica al equipo de administración de Lingowow cuando no hay disponibilidad o se necesita atención especial. Pedir número de teléfono al usuario antes de llamar esta función.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        userPhone: {
          type: SchemaType.STRING,
          description: 'Número de teléfono del usuario para que el equipo lo contacte',
        },
        desiredProgram: {
          type: SchemaType.STRING,
          description: 'Programa y plan que el usuario desea o motivo de la consulta',
        },
        desiredSchedule: {
          type: SchemaType.STRING,
          description: 'Horario preferido por el usuario',
        },
        message: {
          type: SchemaType.STRING,
          description: 'Resumen del contexto de la conversación para que el equipo tenga contexto',
        },
      },
      required: ['userPhone', 'desiredProgram', 'desiredSchedule', 'message'],
    } as unknown as FunctionDeclarationSchema,
  },
}

function getToolsForRole(roles: string[]): FunctionDeclaration[] {
  const tools: FunctionDeclaration[] = [ALL_FUNCTION_DECLARATIONS.check_teacher_availability]

  if (roles.includes('STUDENT')) {
    tools.push(ALL_FUNCTION_DECLARATIONS.get_upcoming_classes)
    tools.push(ALL_FUNCTION_DECLARATIONS.schedule_class)
    tools.push(ALL_FUNCTION_DECLARATIONS.schedule_recurring_classes)
    tools.push(ALL_FUNCTION_DECLARATIONS.reschedule_class)
  }

  if (roles.includes('GUEST')) {
    tools.push(ALL_FUNCTION_DECLARATIONS.check_invoice_status)
    tools.push(ALL_FUNCTION_DECLARATIONS.create_payment_link)
  }

  if (roles.includes('STUDENT') || roles.includes('GUEST')) {
    tools.push(ALL_FUNCTION_DECLARATIONS.notify_admin_telegram)
  }

  return tools
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, roles: true, timezone: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const body = (await req.json()) as { messages: ChatMessage[] }
    const messages = body.messages

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'No messages provided' }, { status: 400 })
    }

    const currentDate = new Intl.DateTimeFormat('es', {
      timeZone: user.timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())

    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace(/{name}/g, user.name ?? 'Usuario')
      .replace(/{role}/g, user.roles.join(', '))
      .replace(/{email}/g, user.email ?? '')
      .replace(/{timezone}/g, user.timezone)
      .replace(/{currentDate}/g, currentDate)

    const toolDeclarations = getToolsForRole(user.roles)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
      ...(toolDeclarations.length > 0 && {
        tools: [{ functionDeclarations: toolDeclarations }] as Tool[],
      }),
    })

    // Build history from all messages except the last
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]
    const chat = model.startChat({ history })

    let result = await chat.sendMessage(lastMessage.content)
    let toolExecuted: string | undefined
    let nudged = false
    let capturedPaymentUrl: string | undefined
    // Agentic loop — max 6 iterations to prevent infinite loops
    for (let i = 0; i < 6; i++) {
      const functionCalls = result.response.functionCalls()

      if (!functionCalls || functionCalls.length === 0) {
        // If the model sent a "pre-action" text without calling the function, nudge it once.
        // This handles Gemini's occasional pattern of announcing an action before executing it.
        if (!nudged && toolDeclarations.length > 0) {
          const previewText = result.response.text().toLowerCase()
          const PENDING_RE =
            /\b(verificar[eé]|comprobar[eé]|revisar[eé]|consultar[eé]|buscar[eé]|proceder[eé]|un momento|un segundo|un segundito|un momentito|voy a|déjame|dejame|ahora mismo|enseguida|procedo|procederé|let me|will check|checking)\b/
          if (PENDING_RE.test(previewText)) {
            nudged = true
            result = await chat.sendMessage('Procede con la acción ahora.')
            continue
          }
        }
        break
      }

      // Execute ALL function calls in this turn — Gemini requires one response per call.
      const functionResponses: Part[] = []

      for (const call of functionCalls) {
        toolExecuted = call.name
        let toolResult: ToolResult

        switch (call.name) {
          case 'check_teacher_availability':
            toolResult = await handleCheckAvailability(
              call.args as { dayOfWeek: string; localTime: string; timezone: string }
            )
            break

          case 'get_upcoming_classes':
            toolResult = await handleGetUpcomingClasses(user.id)
            break

          case 'schedule_class':
            toolResult = await handleScheduleClass({
              userId: user.id,
              ...(call.args as { localDate: string; localTime: string }),
            })
            break

          case 'schedule_recurring_classes':
            toolResult = await handleScheduleRecurringClasses({
              userId: user.id,
              ...(call.args as { slots: Array<{ dayOfWeek: string; localTime: string }> }),
            })
            break

          case 'reschedule_class':
            toolResult = await handleRescheduleClass(
              call.args as { bookingId: string; newDay: string; newTimeSlot: string }
            )
            break

          case 'check_invoice_status':
            toolResult = await handleCheckInvoice(user.id)
            break

          case 'create_payment_link':
            toolResult = await handleCreatePaymentLink({
              ...(call.args as {
                programType: string
                planType: string
                startNow: boolean
                desiredDay: string
                desiredTime: string
              }),
              userEmail: user.email ?? '',
              userName: user.name ?? 'Usuario',
              userId: user.id,
            })
            if (toolResult.success && toolResult.data) {
              capturedPaymentUrl = (toolResult.data as { paymentUrl: string }).paymentUrl
            }
            break

          case 'notify_admin_telegram':
            toolResult = await handleNotifyAdmin({
              ...(call.args as {
                userPhone: string
                desiredProgram: string
                desiredSchedule: string
                message: string
              }),
              userName: user.name ?? 'Usuario',
              userEmail: user.email ?? '',
            })
            break

          default:
            toolResult = { success: false, message: 'Herramienta no reconocida.' }
        }

        functionResponses.push({
          functionResponse: { name: call.name, response: { result: toolResult } },
        } as Part)
      }

      result = await chat.sendMessage(functionResponses)
    }

    // If the loop exhausted iterations and the last result still has pending function calls
    // (no text response), request a plain text summary to avoid returning an empty bubble.
    const loopEndedWithFunctionCall =
      result.response.functionCalls() && result.response.functionCalls()!.length > 0
    if (loopEndedWithFunctionCall) {
      result = await chat.sendMessage('Responde al usuario en texto ahora, en máximo 2 oraciones.')
    }

    // Strip Gemini 2.0 Flash artifacts: the model sometimes leaks internal
    // pseudocode like `print(api.create_payment_link())` as inline code blocks
    // or bare print() statements in its text response.
    const rawText = result.response
      .text()
      .replace(/^`[^`\n]*`\n?/gm, '')        // standalone inline code lines: `print(...)`
      .replace(/^\s*print\s*\([^\n]*\)\n?/gm, '') // bare print(...) lines
      .trim()

    let finalText: string

    if (!rawText && capturedPaymentUrl) {
      // Gemini returned empty text after create_payment_link succeeded — build the response directly.
      finalText = `¡Listo! Aquí está tu link de pago:\n\n${capturedPaymentUrl}\n\nTambién te lo enviamos a tu correo. Una vez que completes el pago tu inscripción se activará automáticamente.`
    } else if (!rawText) {
      finalText = 'Ocurrió un error inesperado. Por favor intenta de nuevo.'
    } else {
      // Gemini did produce text — ensure the PayPal URL wasn't replaced with a placeholder.
      finalText = rawText
      if (capturedPaymentUrl) {
        const placeholder = /\[Payment Link\]|\[link de pago\]|\[enlace de pago\]|\[aquí\]|\[aqui\]/gi
        if (placeholder.test(finalText)) {
          finalText = finalText.replace(placeholder, capturedPaymentUrl)
        } else if (!finalText.includes(capturedPaymentUrl)) {
          finalText = `${finalText}\n\n${capturedPaymentUrl}`
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: finalText,
        ...(toolExecuted && { toolExecuted }),
      },
    })
  } catch (error) {
    console.error('[Chat API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
