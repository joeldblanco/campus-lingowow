interface SlackNotificationData {
  type: 'trial_class' | 'contact_form'
  name: string
  email: string
  phone: string
  language?: string
  subject?: string
  message?: string
}

interface TeacherPaymentConfirmationData {
  teacherId: string
  teacherName: string
  teacherEmail: string
  amount: number
  hasProof: boolean
  confirmedAt: string
}

export async function sendSlackNotification(data: SlackNotificationData): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured, skipping Slack notification')
    return
  }

  const isTrialClass = data.type === 'trial_class'
  
  const languageLabels: Record<string, string> = {
    'english': 'Inglés',
    'spanish': 'Español',
    'french': 'Francés',
    'german': 'Alemán',
    'italian': 'Italiano',
    'portuguese': 'Portugués',
    'chinese': 'Chino Mandarín',
    'japanese': 'Japonés',
  }

  const subjectLabels: Record<string, string> = {
    'informacion': 'Información General',
    'cursos': 'Consulta sobre Cursos',
    'precios': 'Precios y Planes',
    'clase-prueba': 'Clase de Prueba',
    'soporte': 'Soporte Técnico',
    'otro': 'Otro',
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: isTrialClass ? '🎓 Nueva Solicitud de Clase de Prueba' : '📩 Nuevo Mensaje de Contacto',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Nombre:*\n${data.name}`,
        },
        {
          type: 'mrkdwn',
          text: `*Email:*\n${data.email}`,
        },
        {
          type: 'mrkdwn',
          text: `*Teléfono:*\n${data.phone}`,
        },
        {
          type: 'mrkdwn',
          text: isTrialClass
            ? `*Idioma:*\n${languageLabels[data.language || ''] || data.language || 'No especificado'}`
            : `*Asunto:*\n${subjectLabels[data.subject || ''] || data.subject || 'No especificado'}`,
        },
      ],
    },
  ]

  if (!isTrialClass && data.message) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Mensaje:*\n${data.message.substring(0, 500)}${data.message.length > 500 ? '...' : ''}`,
        },
      ],
    })
  }

  blocks.push({
    type: 'context',
    // @ts-expect-error - Slack block kit types
    elements: [
      {
        type: 'mrkdwn',
        text: `📅 ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
      },
    ],
  })

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blocks }),
    })

    if (!response.ok) {
      console.error('Failed to send Slack notification:', response.statusText)
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error)
  }
}

export async function sendTeacherPaymentConfirmationSlack(
  data: TeacherPaymentConfirmationData
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured, skipping Slack notification')
    return
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '💰 Confirmación de Pago de Profesor',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Profesor:*\n${data.teacherName}`,
        },
        {
          type: 'mrkdwn',
          text: `*Email:*\n${data.teacherEmail}`,
        },
        {
          type: 'mrkdwn',
          text: `*Monto:*\n$${data.amount.toFixed(2)}`,
        },
        {
          type: 'mrkdwn',
          text: `*Recibo adjunto:*\n${data.hasProof ? '✅ Sí' : '❌ No'}`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📅 Confirmado: ${new Date(data.confirmedAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '⚠️ *Acción requerida:* Procesar el pago al profesor y marcar como pagado en el sistema.',
      },
    },
  ]

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blocks }),
    })

    if (!response.ok) {
      console.error('Failed to send teacher payment Slack notification:', response.statusText)
    }
  } catch (error) {
    console.error('Error sending teacher payment Slack notification:', error)
  }
}
