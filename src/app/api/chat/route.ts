import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type {
  FunctionDeclaration,
  FunctionDeclarationSchema,
  Part,
  Tool,
} from '@google/generative-ai'
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
import {
  handleAdminCreateInvoice,
  handleAdminSendInvoice,
} from '@/lib/chat-tools/admin-create-invoice'
import { handleAdminListInvoices } from '@/lib/chat-tools/admin-list-invoices'
import { handleAdminCheckInvoicePayment } from '@/lib/chat-tools/admin-check-invoice-payment'
import { handleAdminScheduleClass } from '@/lib/chat-tools/admin-schedule-class'
import { handleAdminEnrollStudent } from '@/lib/chat-tools/admin-enroll-student'
import {
  handleAdminGetStudentClasses,
  handleAdminRescheduleClass,
} from '@/lib/chat-tools/admin-reschedule-class'
import { handleAdminCalculateClassDates } from '@/lib/chat-tools/admin-calculate-class-dates'
import { buildSystemPrompt } from '@/lib/chat-prompts'
import type { ChatMessage, ChatInteraction, ToolResult } from '@/types/ai-chat'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

/**
 * Build a ChatInteraction from a tool result that contains structured selection data.
 * This converts "multiple matches found" results into clickable button options in the UI.
 */
function buildInteractionFromToolResult(
  toolResult: ToolResult | undefined
): ChatInteraction | undefined {
  if (!toolResult || !toolResult.data || typeof toolResult.data !== 'object') return undefined

  const data = toolResult.data as Record<string, unknown>
  const code = data.code as string | undefined
  if (!code) return undefined

  switch (code) {
    case 'MULTIPLE_STUDENTS': {
      const students = data.students as Array<{ name: string; email: string }> | undefined
      if (!students?.length) return undefined
      return {
        kind: 'single-select',
        prompt: 'Selecciona el estudiante:',
        options: students.map((s) => ({
          id: s.email,
          label: `${s.name} (${s.email})`,
        })),
        allowFreeText: false,
      }
    }
    case 'MULTIPLE_TEACHERS': {
      const teachers = data.teachers as Array<{ name: string; email: string }> | undefined
      if (!teachers?.length) return undefined
      return {
        kind: 'single-select',
        prompt: 'Selecciona el profesor:',
        options: teachers.map((t) => ({
          id: t.email,
          label: `${t.name} (${t.email})`,
        })),
        allowFreeText: false,
      }
    }
    case 'MULTIPLE_INVOICES': {
      const invoices = data.invoices as
        | Array<{
            id: string
            invoiceNumber: string
            planName?: string
            total: number
            currency: string
            paidAt?: string
          }>
        | undefined
      if (!invoices?.length) return undefined
      return {
        kind: 'single-select',
        prompt: 'Selecciona la factura:',
        options: invoices.map((inv) => ({
          id: inv.id,
          label: `${inv.invoiceNumber}: ${inv.planName ?? 'Sin plan'} ($${inv.total} ${inv.currency})`,
          payload: { invoiceId: inv.id },
        })),
        allowFreeText: false,
      }
    }
    case 'MULTIPLE_USERS': {
      const users = data.users as Array<{ name: string; email: string }> | undefined
      if (!users?.length) return undefined
      return {
        kind: 'single-select',
        prompt: 'Selecciona el usuario:',
        options: users.map((u) => ({
          id: u.email,
          label: `${u.name} (${u.email})`,
        })),
        allowFreeText: false,
      }
    }
    default:
      return undefined
  }
}

const ALL_FUNCTION_DECLARATIONS: Record<string, FunctionDeclaration> = {
  check_teacher_availability: {
    name: 'check_teacher_availability',
    description:
      'Verifica qué profesores tienen disponibilidad para TODOS los horarios solicitados simultáneamente (ya que un estudiante debe tener el mismo profesor para todas sus clases de la semana). Debe llamarse ANTES de confirmar cualquier agendamiento o enviar links de pago.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slots: {
          type: SchemaType.ARRAY,
          description: 'Lista de franjas horarias semanales a verificar',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              dayOfWeek: {
                type: SchemaType.STRING,
                description:
                  'Día de la semana en la zona horaria del usuario (ej: "lunes" o "monday")',
              },
              localTime: {
                type: SchemaType.STRING,
                description: 'Hora de inicio en formato HH:MM en la zona horaria local del usuario',
              },
            },
            required: ['dayOfWeek', 'localTime'],
          },
        },
        timezone: {
          type: SchemaType.STRING,
          description: 'Zona horaria IANA del usuario (ej: America/Lima, America/New_York)',
        },
      },
      required: ['slots', 'timezone'],
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
          description:
            'Fecha de la clase en formato YYYY-MM-DD en la zona horaria local del estudiante',
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
                description:
                  'Día de la semana en inglés y minúsculas (monday, tuesday, wednesday, thursday, friday, saturday, sunday)',
              },
              localTime: {
                type: SchemaType.STRING,
                description:
                  'Hora de inicio en formato HH:MM en la zona horaria local del estudiante',
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
          description:
            'Nuevo horario en formato HH:MM-HH:MM en la zona horaria local del estudiante',
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
      'Genera un link de pago PayPal para la inscripción del usuario y lo envía por email. Usar cuando el usuario quiere pagar un plan. Solo llamar después de confirmar que no hay factura válida pendiente (check_invoice_status).',
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
          description: 'Hora preferida para las clases en formato HH:MM (hora local del usuario)',
        },
      },
      required: ['programType', 'planType', 'startNow', 'desiredDay', 'desiredTime'],
    } as unknown as FunctionDeclarationSchema,
  },
  notify_admin_telegram: {
    name: 'notify_admin_telegram',
    description:
      'Notifica al equipo de administración de Lingowow EXCLUSIVAMENTE cuando el usuario pide explícitamente hablar con un humano, reporta un error técnico, o hay un caso que ninguna otra herramienta puede resolver. NUNCA usar para pagos o agendamiento — para eso usar create_payment_link y schedule_class/schedule_recurring_classes. Pedir número de teléfono al usuario antes de llamar esta función.',
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

  // =============================================
  // ADMIN TOOLS
  // =============================================

  admin_create_invoice: {
    name: 'admin_create_invoice',
    description:
      'Prepara una factura de PayPal para un cliente. Busca al usuario por nombre o correo, calcula el monto según producto+plan+idioma, y retorna los datos para confirmar antes de enviar. Si hay múltiples usuarios con el mismo nombre, retorna la lista para que el admin confirme.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        clientNameOrEmail: {
          type: SchemaType.STRING,
          description:
            'Nombre del cliente (buscará en la base de datos) o correo electrónico directo',
        },
        programType: {
          type: SchemaType.STRING,
          description: 'Programa: "Esencial" o "Exclusivo"',
        },
        planType: {
          type: SchemaType.STRING,
          description: 'Plan: "Go", "Lingo" o "Wow"',
        },
        startDate: {
          type: SchemaType.STRING,
          description: 'Fecha de inicio del plan (ej: "marzo 2026", "2026-03-01", "inmediato")',
        },
        language: {
          type: SchemaType.STRING,
          description:
            'Idioma que el cliente estudia: "en" para inglés, "es" para español. Por defecto "en".',
        },
      },
      required: ['clientNameOrEmail', 'programType', 'planType', 'startDate'],
    } as unknown as FunctionDeclarationSchema,
  },
  admin_send_invoice: {
    name: 'admin_send_invoice',
    description:
      'Envía la factura de PayPal previamente preparada con admin_create_invoice. Solo llamar DESPUÉS de que el admin confirme los datos (monto, destinatario, plan). Requiere todos los datos devueltos por admin_create_invoice.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        recipientEmail: {
          type: SchemaType.STRING,
          description: 'Correo del destinatario (obtenido de admin_create_invoice)',
        },
        recipientName: {
          type: SchemaType.STRING,
          description: 'Nombre del destinatario (obtenido de admin_create_invoice)',
        },
        planDisplayName: {
          type: SchemaType.STRING,
          description: 'Nombre del plan para la factura (obtenido de admin_create_invoice)',
        },
        amount: {
          type: SchemaType.STRING,
          description: 'Monto de la factura (obtenido de admin_create_invoice)',
        },
        currency: {
          type: SchemaType.STRING,
          description: 'Moneda (obtenido de admin_create_invoice)',
        },
        description: {
          type: SchemaType.STRING,
          description: 'Descripción para la factura (obtenido de admin_create_invoice)',
        },
        invoiceNumber: {
          type: SchemaType.STRING,
          description: 'Número de factura (obtenido de admin_create_invoice)',
        },
      },
      required: [
        'recipientEmail',
        'recipientName',
        'planDisplayName',
        'amount',
        'currency',
        'description',
        'invoiceNumber',
      ],
    } as unknown as FunctionDeclarationSchema,
  },
  admin_list_invoices: {
    name: 'admin_list_invoices',
    description:
      'Lista las facturas de PayPal enviadas a un cliente. Busca por nombre (busca el correo en la base de datos) o directamente por correo electrónico.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        clientNameOrEmail: {
          type: SchemaType.STRING,
          description: 'Nombre del cliente o correo electrónico para buscar sus facturas',
        },
      },
      required: ['clientNameOrEmail'],
    } as unknown as FunctionDeclarationSchema,
  },
  admin_check_invoice_payment: {
    name: 'admin_check_invoice_payment',
    description:
      'Verifica si una factura de PayPal ya fue pagada. Acepta un link de PayPal (ej: https://www.paypal.com/invoice/p/#XXXX) o un ID de factura (ej: INV2-XXXX-XXXX-XXXX-XXXX).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        invoiceLinkOrId: {
          type: SchemaType.STRING,
          description: 'Link de PayPal de la factura o ID de la factura',
        },
      },
      required: ['invoiceLinkOrId'],
    } as unknown as FunctionDeclarationSchema,
  },
  admin_enroll_student: {
    name: 'admin_enroll_student',
    description:
      'Inscribe a un estudiante en un curso y periodo académico, y le agenda sus clases en los horarios dados. REQUIERE una factura pagada. Para cursos sincrónicos, REQUIERE un profesor. Puede promover de invitado a estudiante si es necesario.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        studentNameOrEmail: {
          type: SchemaType.STRING,
          description: 'Nombre o correo del estudiante a inscribir',
        },
        teacherNameOrEmail: {
          type: SchemaType.STRING,
          description:
            'Nombre o correo del profesor seleccionado (OBLIGATORIO para cursos sincrónicos)',
        },
        invoiceId: {
          type: SchemaType.STRING,
          description:
            'ID de la factura pagada (obtenido de admin_check_invoice_payment o admin_list_invoices). Si no se proporciona, se busca automáticamente la factura pagada más reciente.',
        },
        courseName: {
          type: SchemaType.STRING,
          description:
            'Nombre del curso. Por defecto se resuelve automáticamente desde la factura pagada (plan → PlanPricing → curso).',
        },
        periodQuery: {
          type: SchemaType.STRING,
          description: 'Nombre o referencia al periodo académico (opcional, por defecto el actual)',
        },
        slots: {
          type: SchemaType.ARRAY,
          description: 'Días y horas para las clases semanales (requerido para cursos sincrónicos)',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              dayOfWeek: {
                type: SchemaType.STRING,
                description: 'Día de la semana en la zona horaria del estudiante (ej: "lunes")',
              },
              localTime: {
                type: SchemaType.STRING,
                description:
                  'Hora de inicio de la clase en la zona horaria del estudiante, formato HH:MM (ej: "17:00")',
              },
            },
            required: ['dayOfWeek', 'localTime'],
          },
        },
        adminTimezone: {
          type: SchemaType.STRING,
          description:
            'La zona horaria proporcionada por el admin (ej: "America/Chicago"), o vacío para usar la del estudiante.',
        },
      },
      required: ['studentNameOrEmail', 'slots'],
    },
  },
  admin_schedule_class: {
    name: 'admin_schedule_class',
    description:
      'Agenda clases recurrentes para un estudiante (o invitado — lo promueve a estudiante automáticamente). Busca al usuario por nombre o correo, verifica disponibilidad de profesores, y crea las clases para todo el período académico activo. Las fechas se guardan en UTC internamente.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        studentNameOrEmail: {
          type: SchemaType.STRING,
          description: 'Nombre o correo del estudiante para quien se agendarán las clases',
        },
        teacherId: {
          type: SchemaType.STRING,
          description:
            'ID del profesor seleccionado por el admin. Garantiza que todas las clases sean con el mismo profesor.',
        },
        slots: {
          type: SchemaType.ARRAY,
          description: 'Lista de franjas horarias recurrentes (un elemento por día de la semana)',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              dayOfWeek: {
                type: SchemaType.STRING,
                description:
                  'Día de la semana (en español o inglés: lunes/monday, martes/tuesday, etc.)',
              },
              localTime: {
                type: SchemaType.STRING,
                description:
                  'Hora de inicio en formato HH:MM en la zona horaria local del estudiante (ej: 17:00)',
              },
            },
            required: ['dayOfWeek', 'localTime'],
          },
        },
        studentTimezone: {
          type: SchemaType.STRING,
          description:
            'Zona horaria IANA del estudiante (ej: America/Chicago). Si el admin mencionó una ubicación como "Arkansas", resuelve a la zona IANA correspondiente.',
        },
      },
      required: ['studentNameOrEmail', 'slots'],
    } as unknown as FunctionDeclarationSchema,
  },
  admin_get_student_classes: {
    name: 'admin_get_student_classes',
    description:
      'Obtiene las próximas clases confirmadas de un estudiante. Busca al usuario por nombre o correo. Necesario antes de reagendar para obtener el ID de la clase.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        studentNameOrEmail: {
          type: SchemaType.STRING,
          description: 'Nombre o correo del estudiante',
        },
      },
      required: ['studentNameOrEmail'],
    } as unknown as FunctionDeclarationSchema,
  },
  admin_reschedule_class: {
    name: 'admin_reschedule_class',
    description:
      'Reagenda una clase específica de un estudiante a un nuevo horario. Requiere el bookingId obtenido de admin_get_student_classes. Verifica disponibilidad de profesores en el nuevo horario.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        bookingId: {
          type: SchemaType.STRING,
          description: 'ID de la clase a reagendar (obtenido de admin_get_student_classes)',
        },
        newLocalDate: {
          type: SchemaType.STRING,
          description: 'Nueva fecha en formato YYYY-MM-DD en la zona horaria local del estudiante',
        },
        newLocalTime: {
          type: SchemaType.STRING,
          description:
            'Nueva hora de inicio en formato HH:MM en la zona horaria local del estudiante',
        },
      },
      required: ['bookingId', 'newLocalDate', 'newLocalTime'],
    } as unknown as FunctionDeclarationSchema,
  },
  admin_calculate_class_dates: {
    name: 'admin_calculate_class_dates',
    description:
      'Calcula las fechas de clases en horario local dado un horario semanal y un período académico. Útil para planificar sin agendar. Si el período es el actual, hace prorrateo (solo fechas futuras). Si es pasado, lo indica. Acepta: "actual", "siguiente", o el nombre del período.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slots: {
          type: SchemaType.ARRAY,
          description: 'Lista de franjas horarias semanales',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              dayOfWeek: {
                type: SchemaType.STRING,
                description: 'Día de la semana (en español o inglés)',
              },
              localTime: {
                type: SchemaType.STRING,
                description: 'Hora de inicio en formato HH:MM (ej: 17:00)',
              },
            },
            required: ['dayOfWeek', 'localTime'],
          },
        },
        periodQuery: {
          type: SchemaType.STRING,
          description: 'Período: "actual", "siguiente", o nombre del período (ej: "Marzo 2026")',
        },
        timezone: {
          type: SchemaType.STRING,
          description:
            'Zona horaria IANA para el cálculo (ej: America/Chicago). Por defecto usa la del admin.',
        },
      },
      required: ['slots', 'periodQuery'],
    } as unknown as FunctionDeclarationSchema,
  },
}

function getToolsForRole(roles: string[]): FunctionDeclaration[] {
  const tools: FunctionDeclaration[] = [ALL_FUNCTION_DECLARATIONS.check_teacher_availability]

  if (roles.includes('ADMIN')) {
    tools.push(ALL_FUNCTION_DECLARATIONS.admin_create_invoice)
    tools.push(ALL_FUNCTION_DECLARATIONS.admin_send_invoice)
    tools.push(ALL_FUNCTION_DECLARATIONS.admin_list_invoices)
    tools.push(ALL_FUNCTION_DECLARATIONS.admin_check_invoice_payment)
    tools.push(ALL_FUNCTION_DECLARATIONS.admin_schedule_class)
    tools.push(ALL_FUNCTION_DECLARATIONS.admin_enroll_student)
    tools.push(ALL_FUNCTION_DECLARATIONS.admin_get_student_classes)
    tools.push(ALL_FUNCTION_DECLARATIONS.admin_reschedule_class)
    tools.push(ALL_FUNCTION_DECLARATIONS.admin_calculate_class_dates)
  }

  if (roles.includes('STUDENT')) {
    tools.push(ALL_FUNCTION_DECLARATIONS.get_upcoming_classes)
    tools.push(ALL_FUNCTION_DECLARATIONS.schedule_class)
    tools.push(ALL_FUNCTION_DECLARATIONS.schedule_recurring_classes)
    tools.push(ALL_FUNCTION_DECLARATIONS.reschedule_class)
  }

  // Both STUDENT and GUEST can check invoices and create payment links
  // (students may need to renew or their enrollment may have expired)
  if (roles.includes('GUEST') || roles.includes('STUDENT')) {
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

    const rawUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, roles: true, timezone: true },
    })

    if (!rawUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const user = { ...rawUser, timezone: rawUser.timezone || 'America/Lima' }

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

    const systemPrompt = buildSystemPrompt({
      name: user.name ?? 'Usuario',
      role: user.roles.join(', '),
      email: user.email ?? '',
      timezone: user.timezone,
      currentDate,
      roles: user.roles,
    })

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

    console.log(
      `[Chat API] User: ${user.name} | Roles: ${user.roles.join(',')} | TZ: ${user.timezone} | Tools: ${toolDeclarations.map((t) => t.name).join(', ')}`
    )

    let result = await chat.sendMessage(lastMessage.content)
    let toolExecuted: string | undefined
    let lastToolResult: ToolResult | undefined
    let nudged = false
    let capturedPaymentUrl: string | undefined
    let capturedPreNudgeText: string | undefined
    let functionResponses: Part[] = []
    // Agentic loop — max 6 iterations to prevent infinite loops
    for (let i = 0; i < 6; i++) {
      const functionCalls = result.response.functionCalls()

      if (!functionCalls || functionCalls.length === 0) {
        // If the model sent a "pre-action" text without calling the function, nudge it once.
        if (!nudged && toolDeclarations.length > 0) {
          let previewText = ''
          try {
            previewText = result.response.text().toLowerCase()
          } catch {
            // No text parts — nothing to nudge, just break
            break
          }
          const PENDING_RE =
            /\b(verificar[eé]|comprobar[eé]|revisar[eé]|consultar[eé]|buscar[eé]|proceder[eé]|un momento|un segundo|un segundito|un momentito|voy a|déjame|dejame|ahora mismo|enseguida|procedo|procederé|generar[eé]|let me|will check|checking|necesito saber|necesito la|para confirmar|para poder|podrías indicar|podrias indicar|no tengo acceso|no puedo ver|indicame|indícame|dime cu[aá]l)\b/
          if (PENDING_RE.test(previewText)) {
            nudged = true
            // Capture the pre-nudge text so we can use it as a fallback
            try {
              capturedPreNudgeText = result.response.text().trim()
            } catch {
              /* ignore */
            }
            // Be very explicit about what to do — the generic nudge was failing
            const availableToolNames = toolDeclarations.map((t) => t.name).join(', ')
            result = await chat.sendMessage(
              `NO respondas con texto ni hagas preguntas. Llama UNA de estas funciones AHORA: ${availableToolNames}. ` +
                `Resuelve las zonas horarias tú mismo (ej: Arkansas=America/Chicago). Convierte horas a HH:MM (ej: 5pm=17:00). ` +
                `Si el usuario necesita pagar, llama check_invoice_status. Si no tiene factura, llama create_payment_link.`
            )
            continue
          }
        }
        break
      }

      // Execute ALL function calls in this turn — Gemini requires one response per call.
      functionResponses = []

      for (const call of functionCalls) {
        toolExecuted = call.name
        let toolResult: ToolResult

        switch (call.name) {
          case 'check_teacher_availability':
            toolResult = await handleCheckAvailability(
              call.args as {
                slots: Array<{ dayOfWeek: string; localTime: string }>
                timezone: string
              }
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
            console.log('[Chat API] create_payment_link args:', JSON.stringify(call.args))
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
            console.log('[Chat API] create_payment_link result:', JSON.stringify(toolResult))
            if (toolResult.success && toolResult.data) {
              capturedPaymentUrl = (toolResult.data as { paymentUrl: string }).paymentUrl
              console.log('[Chat API] capturedPaymentUrl:', capturedPaymentUrl)
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

          // ── Admin tools ──────────────────────────────────────────

          case 'admin_create_invoice':
            toolResult = await handleAdminCreateInvoice(
              call.args as {
                clientNameOrEmail: string
                programType: string
                planType: string
                startDate: string
                language: string
              }
            )
            break

          case 'admin_send_invoice':
            toolResult = await handleAdminSendInvoice(
              call.args as {
                recipientEmail: string
                recipientName: string
                planDisplayName: string
                amount: string
                currency: string
                description: string
                invoiceNumber: string
              }
            )
            break

          case 'admin_list_invoices':
            toolResult = await handleAdminListInvoices(call.args as { clientNameOrEmail: string })
            break

          case 'admin_check_invoice_payment':
            toolResult = await handleAdminCheckInvoicePayment(
              call.args as { invoiceLinkOrId: string }
            )
            break

          case 'admin_enroll_student': {
            const enrollArgs = call.args as {
              studentNameOrEmail: string
              teacherNameOrEmail?: string
              invoiceId?: string
              courseName?: string
              periodQuery?: string
              slots: Array<{ dayOfWeek: string; localTime: string }>
              adminTimezone?: string
            }
            toolResult = await handleAdminEnrollStudent({
              studentNameOrEmail: enrollArgs.studentNameOrEmail,
              teacherNameOrEmail: enrollArgs.teacherNameOrEmail,
              invoiceId: enrollArgs.invoiceId,
              courseName: enrollArgs.courseName,
              periodQuery: enrollArgs.periodQuery,
              slots: enrollArgs.slots,
              adminTimezone: enrollArgs.adminTimezone || user.timezone,
            })
            break
          }

          case 'admin_schedule_class': {
            const schedArgs = call.args as {
              studentNameOrEmail: string
              teacherId?: string
              slots: Array<{ dayOfWeek: string; localTime: string }>
              studentTimezone?: string
            }
            toolResult = await handleAdminScheduleClass({
              studentNameOrEmail: schedArgs.studentNameOrEmail,
              teacherId: schedArgs.teacherId,
              slots: schedArgs.slots,
              adminTimezone: schedArgs.studentTimezone || user.timezone,
            })
            break
          }

          case 'admin_get_student_classes':
            toolResult = await handleAdminGetStudentClasses(
              call.args as { studentNameOrEmail: string }
            )
            break

          case 'admin_reschedule_class':
            toolResult = await handleAdminRescheduleClass(
              call.args as {
                bookingId: string
                newLocalDate: string
                newLocalTime: string
              }
            )
            break

          case 'admin_calculate_class_dates': {
            const calcArgs = call.args as {
              slots: Array<{ dayOfWeek: string; localTime: string }>
              periodQuery: string
              timezone?: string
            }
            toolResult = await handleAdminCalculateClassDates({
              slots: calcArgs.slots,
              periodQuery: calcArgs.periodQuery,
              timezone: calcArgs.timezone || user.timezone,
            })
            break
          }

          default:
            toolResult = { success: false, message: 'Herramienta no reconocida.' }
        }

        lastToolResult = toolResult

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
    // NOTE: .text() can throw if the response only contains function calls,
    // so we wrap it in a try-catch.
    let rawText = ''
    try {
      rawText = result.response
        .text()
        .replace(/^`[^`\n]*`\n?/gm, '') // standalone inline code lines: `print(...)`
        .replace(/^\s*print\s*\([^\n]*\)\n?/gm, '') // bare print(...) lines
        .trim()
    } catch {
      // Gemini returned no text parts — rawText stays empty
    }

    // Collect the last tool result message as a fallback if Gemini produced no text
    const lastToolMessage =
      functionResponses.length > 0
        ? (
            functionResponses[functionResponses.length - 1] as {
              functionResponse?: { response?: { result?: { message?: string } } }
            }
          ).functionResponse?.response?.result?.message
        : undefined

    let finalText: string

    if (!rawText && capturedPaymentUrl) {
      // Gemini returned empty text after create_payment_link succeeded — build the response directly.
      finalText = `¡Listo! Aquí está tu link de pago:\n\n${capturedPaymentUrl}\n\nTambién te lo enviamos a tu correo. Una vez que completes el pago tu inscripción se activará automáticamente.`
    } else if (!rawText && lastToolMessage) {
      // Gemini returned empty text but a tool left a human-readable message — use that.
      console.log('[Chat API] Using lastToolMessage as fallback:', lastToolMessage)
      finalText = lastToolMessage
    } else if (!rawText) {
      console.log(
        '[Chat API] FALLBACK: rawText is empty, no capturedPaymentUrl, no lastToolMessage'
      )
      console.log('[Chat API]  functionResponses count:', functionResponses.length)
      console.log(
        '[Chat API]  nudged:',
        nudged,
        'preNudgeText:',
        capturedPreNudgeText?.slice(0, 50)
      )
      // If nudging failed but we captured the pre-nudge text, use that instead of the generic error
      finalText =
        capturedPreNudgeText ||
        'No pude completar tu solicitud en este momento. Por favor intenta de nuevo o contáctanos por WhatsApp al +51 902 518 947.'
    } else {
      // Gemini did produce text — ensure the PayPal URL wasn't replaced with a placeholder.
      finalText = rawText
      if (capturedPaymentUrl) {
        // Replace common Gemini placeholders with the real URL
        // NOTE: Use string replace-all pattern to avoid regex lastIndex issues
        const placeholderPattern =
          /\[(?:Payment Link|link de pago|enlace de pago|aquí|aqui|URL[^\]]*inválida[^\]]*|URL[^\]]*pago[^\]]*)\]/gi
        if (placeholderPattern.test(finalText)) {
          // Reset lastIndex after .test() — required because /g regex retains state
          placeholderPattern.lastIndex = 0
          finalText = finalText.replace(placeholderPattern, capturedPaymentUrl)
        } else if (!finalText.includes(capturedPaymentUrl)) {
          finalText = `${finalText}\n\n${capturedPaymentUrl}`
        }
      }
    }

    // Build interaction (clickable buttons) from the last tool result if applicable
    const interaction = buildInteractionFromToolResult(lastToolResult)

    return NextResponse.json({
      success: true,
      data: {
        response: finalText,
        ...(toolExecuted && { toolExecuted }),
        ...(interaction && { interaction }),
      },
    })
  } catch (error) {
    console.error('[Chat API] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
