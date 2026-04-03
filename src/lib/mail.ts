import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_COLORS = {
  canvas: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  primary: '#137fec',
  primarySoft: '#eff6ff',
  success: '#16a34a',
  successSoft: '#ecfdf5',
  purple: '#7c3aed',
  purpleSoft: '#f5f3ff',
  indigo: '#4f46e5',
  indigoSoft: '#eef2ff',
  warning: '#d97706',
  warningSoft: '#fff7ed',
  dark: '#020617',
} as const

const EMAIL_CARD_STYLE = [
  'font-family: Arial, sans-serif',
  'max-width: 600px',
  'margin: 0 auto',
  `border: 1px solid ${EMAIL_COLORS.border}`,
  'border-radius: 16px',
  'overflow: hidden',
  `background-color: ${EMAIL_COLORS.surface}`,
].join('; ')

const EMAIL_FOOTER_STYLE = [
  'padding: 12px 20px 24px 20px',
  `background-color: ${EMAIL_COLORS.canvas}`,
  'text-align: center',
  'font-size: 13px',
  `color: ${EMAIL_COLORS.muted}`,
].join('; ')

const emailButtonStyle = (backgroundColor: string) =>
  [
    'display: inline-block',
    `background-color: ${backgroundColor}`,
    'color: #ffffff',
    'padding: 14px 28px',
    'border-radius: 10px',
    'text-decoration: none',
    'font-size: 16px',
    'font-weight: bold',
  ].join('; ')

const renderSummaryRows = (
  rows: Array<{
    label: string
    value: string
    labelColor?: string
    valueColor?: string
    isEmphasized?: boolean
  }>
) => `
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    ${rows
      .map(
        (row, index) => `
      <tr>
        <td style="padding: ${index === 0 ? '0 0 8px 0' : '8px 0 0 0'}; font-size: ${
          row.isEmphasized ? '16px' : '14px'
        }; color: ${row.labelColor ?? EMAIL_COLORS.muted}; ${
          row.isEmphasized ? 'font-weight: bold;' : ''
        }">${row.label}</td>
        <td style="padding: ${index === 0 ? '0 0 8px 0' : '8px 0 0 0'}; text-align: right; font-size: ${
          row.isEmphasized ? '18px' : '14px'
        }; color: ${row.valueColor ?? EMAIL_COLORS.body}; ${
          row.isEmphasized ? 'font-weight: bold;' : ''
        }">${row.value}</td>
      </tr>`
      )
      .join('')}
  </table>`

const renderEmailLayout = ({
  headerBackgroundColor,
  headerTitle,
  headerSubtitle,
  bodyHtml,
  footerText = 'Go wow with us! 🚀',
  headerTitleColor = '#ffffff',
  headerSubtitleColor,
}: {
  headerBackgroundColor: string
  headerTitle: string
  headerSubtitle?: string
  bodyHtml: string
  footerText?: string
  headerTitleColor?: string
  headerSubtitleColor?: string
}) => {
  const resolvedHeaderSubtitleColor =
    headerSubtitleColor ??
    (headerTitleColor === '#ffffff' ? 'rgba(255, 255, 255, 0.88)' : EMAIL_COLORS.muted)

  return `
    <div style="margin: 0; padding: 24px 12px; background-color: ${EMAIL_COLORS.canvas};">
      <div style="${EMAIL_CARD_STYLE}">
        <div style="padding: 24px; background-color: ${headerBackgroundColor}; text-align: center;">
          <h2 style="margin: 0; font-size: 26px; line-height: 1.3; color: ${headerTitleColor};">${headerTitle}</h2>
          ${
            headerSubtitle
              ? `<p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.5; color: ${resolvedHeaderSubtitleColor};">${headerSubtitle}</p>`
              : ''
          }
        </div>
        <div style="padding: 24px;">
          ${bodyHtml}
        </div>
        <div style="${EMAIL_FOOTER_STYLE}">
          ${footerText}
        </div>
      </div>
    </div>`
}

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmLink = `${process.env.NEXT_PUBLIC_DOMAIN}/auth/new-verification?token=${token}`

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: 'Confirma tu correo electrónico',
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.primarySoft,
      headerTitle: 'Confirmación de registro',
      headerSubtitle:
        'Confirma tu dirección de correo electrónico para acceder a todas las funcionalidades de Lingowow.',
      headerTitleColor: EMAIL_COLORS.text,
      headerSubtitleColor: EMAIL_COLORS.muted,
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">¡Bienvenido a bordo!</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Gracias por registrarte en Lingowow. Haz clic en el botón de abajo para confirmar tu cuenta.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${confirmLink}" style="${emailButtonStyle(EMAIL_COLORS.primary)}">Validar correo electrónico</a>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Si no has sido tú quien se ha registrado, puedes ignorar este correo.</p>
      `,
    }),
  })
}

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const confirmLink = `${process.env.NEXT_PUBLIC_DOMAIN}/auth/new-password?token=${token}`

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: 'Recupera tu contraseña',
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.primarySoft,
      headerTitle: 'Recupera tu contraseña',
      headerSubtitle:
        'Restablece el acceso a tu cuenta con un único paso seguro.',
      headerTitleColor: EMAIL_COLORS.text,
      headerSubtitleColor: EMAIL_COLORS.muted,
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Recupera tu contraseña</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Recupera tu contraseña para acceder a todas las funcionalidades de Lingowow. Haz clic en el botón de abajo para recuperar tu contraseña.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${confirmLink}" style="${emailButtonStyle(EMAIL_COLORS.primary)}">Recuperar contraseña</a>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Si no has sido tú quien ha solicitado la recuperación de tu contraseña, puedes ignorar este correo.</p>
      `,
    }),
  })
}

interface PurchaseItem {
  name: string
  price: number
  quantity: number
}

interface PaymentConfirmationData {
  customerName: string
  invoiceNumber: string
  items: PurchaseItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  currency: string
}

export const sendPaymentConfirmationEmail = async (
  email: string,
  data: PaymentConfirmationData
) => {
  const dashboardLink = `${process.env.NEXT_PUBLIC_DOMAIN}/dashboard`

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_COLORS.border}; color: ${EMAIL_COLORS.body};">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_COLORS.border}; text-align: center; color: ${EMAIL_COLORS.body};">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_COLORS.border}; text-align: right; color: ${EMAIL_COLORS.body};">$${item.price.toFixed(2)} ${data.currency}</td>
    </tr>
  `
    )
    .join('')

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: `¡Gracias por tu compra! - Factura ${data.invoiceNumber}`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.success,
      headerTitle: '¡Pago confirmado!',
      headerSubtitle: 'Tu compra ha sido procesada exitosamente',
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Hola ${data.customerName},</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Gracias por confiar en Lingowow. Tu pago ha sido procesado correctamente y ya puedes acceder a tus cursos.</p>

        <div style="background-color: ${EMAIL_COLORS.canvas}; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_COLORS.muted};">Número de factura:</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${EMAIL_COLORS.text};">${data.invoiceNumber}</p>
        </div>

        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: ${EMAIL_COLORS.canvas};">
              <th style="padding: 12px; text-align: left; font-size: 14px; color: ${EMAIL_COLORS.body};">Producto</th>
              <th style="padding: 12px; text-align: center; font-size: 14px; color: ${EMAIL_COLORS.body};">Cant.</th>
              <th style="padding: 12px; text-align: right; font-size: 14px; color: ${EMAIL_COLORS.body};">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="border-top: 2px solid ${EMAIL_COLORS.border}; padding-top: 16px; margin-top: 16px;">
          ${renderSummaryRows([
            {
              label: 'Subtotal:',
              value: `$${data.subtotal.toFixed(2)} ${data.currency}`,
            },
            ...(data.discount > 0
              ? [
                  {
                    label: 'Descuento:',
                    value: `-$${data.discount.toFixed(2)} ${data.currency}`,
                    labelColor: EMAIL_COLORS.primary,
                    valueColor: EMAIL_COLORS.primary,
                  },
                ]
              : []),
            ...(data.tax > 0
              ? [
                  {
                    label: 'Impuestos:',
                    value: `$${data.tax.toFixed(2)} ${data.currency}`,
                  },
                ]
              : []),
            {
              label: 'Total:',
              value: `$${data.total.toFixed(2)} ${data.currency}`,
              labelColor: EMAIL_COLORS.text,
              valueColor: EMAIL_COLORS.text,
              isEmphasized: true,
            },
          ])}
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${dashboardLink}" style="${emailButtonStyle(EMAIL_COLORS.dark)}">Ir a mi Dashboard</a>
        </div>

        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Si tienes alguna pregunta, no dudes en contactarnos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a> o en info@lingowow.com</p>
      `,
    }),
  })
}

interface ClassReminderData {
  studentName: string
  courseName: string
  teacherName: string
  classDate: string
  classTime: string
  classLink: string
}

export const sendClassReminderEmail = async (email: string, data: ClassReminderData) => {
  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: `Recordatorio: Tu clase de ${data.courseName} es hoy`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.primary,
      headerTitle: '¡Tu clase es hoy!',
      headerSubtitle: 'No olvides conectarte a tiempo',
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Hola ${data.studentName},</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Te recordamos que tienes una clase programada para hoy. ¡Prepárate para aprender!</p>

        <div style="background-color: ${EMAIL_COLORS.primarySoft}; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${EMAIL_COLORS.primary};">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Curso</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: ${EMAIL_COLORS.text};">${data.courseName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Profesor/a</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.body};">${data.teacherName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Fecha</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.body};">${data.classDate}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Hora</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: ${EMAIL_COLORS.primary};">${data.classTime}</p>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.classLink}" style="${emailButtonStyle(EMAIL_COLORS.primary)}">Unirse a la Clase</a>
        </div>

        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">El enlace estará disponible 5 minutos antes de la hora programada.</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      `,
    }),
  })
}

interface TrialClassRequestData {
  name: string
  email: string
  phone: string
  language: string
}

export const sendTrialClassRequestEmail = async (data: TrialClassRequestData) => {
  const languageLabels: Record<string, string> = {
    english: 'Inglés',
    spanish: 'Español',
    french: 'Francés',
    german: 'Alemán',
    italian: 'Italiano',
    portuguese: 'Portugués',
    chinese: 'Chino Mandarín',
    japanese: 'Japonés',
  }

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: 'info@lingowow.com',
    replyTo: data.email,
    subject: `[Clase de Prueba] Nueva solicitud - ${data.name}`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.primary,
      headerTitle: 'Nueva solicitud de clase de prueba',
      footerText: 'Solicitud desde el formulario de lingowow.com',
      bodyHtml: `
        <div style="background-color: ${EMAIL_COLORS.canvas}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Nombre</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${data.name}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Email</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};"><a href="mailto:${data.email}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">${data.email}</a></p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Teléfono</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${data.phone}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Idioma de interés</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text}; font-weight: bold;">${languageLabels[data.language] || data.language}</p>
          </div>
        </div>

        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Contactar en las próximas 24 horas para agendar la clase de prueba.</p>
      `,
    }),
  })

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: data.email,
    subject: '¡Recibimos tu solicitud de clase de prueba! - Lingowow',
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.primary,
      headerTitle: '¡Solicitud recibida!',
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Hola ${data.name},</h3>
        <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">¡Gracias por tu interés en aprender ${languageLabels[data.language] || data.language} con nosotros!</p>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Hemos recibido tu solicitud de clase de prueba gratuita. Un miembro de nuestro equipo se pondrá en contacto contigo en las próximas 24 horas para coordinar tu sesión.</p>

        <div style="background-color: ${EMAIL_COLORS.primarySoft}; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid ${EMAIL_COLORS.primary};">
          <p style="margin: 0; font-size: 14px; color: ${EMAIL_COLORS.primary}; font-weight: bold;">¿Qué incluye tu clase de prueba?</p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${EMAIL_COLORS.primary}; line-height: 1.6;">
            <li>Sesión de 30 minutos con un profesor nativo</li>
            <li>Evaluación de tu nivel actual</li>
            <li>Plan de estudio personalizado</li>
            <li>Sin compromiso de compra</li>
          </ul>
        </div>

        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted};">Si tienes alguna pregunta mientras tanto, puedes contactarnos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      `,
    }),
  })
}

interface CreditPurchaseData {
  customerName: string
  invoiceNumber: string
  creditsAmount: number
  price: number
  currency: string
}

export const sendCreditPurchaseConfirmationEmail = async (
  email: string,
  data: CreditPurchaseData
) => {
  const dashboardLink = `${process.env.NEXT_PUBLIC_DOMAIN}/dashboard`

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: `¡Créditos agregados! - Factura ${data.invoiceNumber}`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.purple,
      headerTitle: '¡Créditos agregados!',
      headerSubtitle: 'Tu compra ha sido procesada exitosamente',
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Hola ${data.customerName},</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Gracias por tu compra. Tus créditos ya están disponibles en tu cuenta.</p>

        <div style="background-color: ${EMAIL_COLORS.purpleSoft}; border-radius: 16px; padding: 24px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_COLORS.muted};">Créditos agregados:</p>
          <p style="margin: 0; font-size: 48px; font-weight: bold; color: ${EMAIL_COLORS.purple};">${data.creditsAmount}</p>
        </div>

        <div style="background-color: ${EMAIL_COLORS.canvas}; border-radius: 12px; padding: 16px; margin: 20px 0;">
          ${renderSummaryRows([
            {
              label: 'Número de factura:',
              value: data.invoiceNumber,
              labelColor: EMAIL_COLORS.muted,
              valueColor: EMAIL_COLORS.text,
            },
            {
              label: 'Total pagado:',
              value: `$${data.price.toFixed(2)} ${data.currency}`,
              labelColor: EMAIL_COLORS.muted,
              valueColor: EMAIL_COLORS.text,
            },
          ])}
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${dashboardLink}" style="${emailButtonStyle(EMAIL_COLORS.purple)}">Ver mis créditos</a>
        </div>

        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Puedes usar tus créditos para reservar clases adicionales o acceder a contenido premium.</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      `,
    }),
  })
}

interface ContactFormData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

interface TeacherPaymentConfirmationEmailData {
  teacherName: string
  teacherEmail: string
  amount: number
  hasProof: boolean
  confirmedAt: string
}

export const sendTeacherPaymentConfirmationAdminEmail = async (
  data: TeacherPaymentConfirmationEmailData
) => {
  const adminDashboardLink = `${process.env.NEXT_PUBLIC_DOMAIN}/admin/payments/teachers`

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: 'info@lingowow.com',
    subject: `[Pago Profesor] ${data.teacherName} confirmó $${data.amount.toFixed(2)}`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.success,
      headerTitle: '💰 Confirmación de pago',
      headerSubtitle: 'Un profesor ha confirmado su monto de pago',
      footerText: 'Notificación automática del sistema de pagos de Lingowow',
      bodyHtml: `
        <div style="background-color: ${EMAIL_COLORS.canvas}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Profesor</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text}; font-weight: bold;">${data.teacherName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Email</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};"><a href="mailto:${data.teacherEmail}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">${data.teacherEmail}</a></p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Monto confirmado</p>
            <p style="margin: 4px 0 0 0; font-size: 24px; color: ${EMAIL_COLORS.success}; font-weight: bold;">$${data.amount.toFixed(2)}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Recibo por honorarios</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${data.hasProof ? '✅ Adjuntado' : '❌ No adjuntado'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Fecha de confirmación</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${new Date(data.confirmedAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
          </div>
        </div>

        <div style="background-color: ${EMAIL_COLORS.warningSoft}; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid ${EMAIL_COLORS.warning};">
          <p style="margin: 0; font-size: 14px; color: ${EMAIL_COLORS.warning}; font-weight: bold;">⚠️ Acción requerida</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.warning};">Procesar el pago al profesor y marcar como pagado en el sistema.</p>
        </div>

        <div style="text-align: center; margin: 24px 0 0 0;">
          <a href="${adminDashboardLink}" style="${emailButtonStyle(EMAIL_COLORS.success)}">Ver Panel de Pagos</a>
        </div>
      `,
    }),
  })
}

// =============================================
// EMAILS DE NOTIFICACIONES DEL SISTEMA
// =============================================

interface NewEnrollmentTeacherEmailData {
  teacherName: string
  studentName: string
  courseName: string
  enrollmentDate?: string
  studentScheduleSummary?: string
}

interface EnrollmentConfirmationStudentEmailData {
  studentName: string
  courseName: string
  teacherName?: string
  firstClassDate?: string
  firstClassTime?: string
  isSynchronousCourse?: boolean
}

export const sendNewEnrollmentTeacherEmail = async (
  email: string,
  data: NewEnrollmentTeacherEmailData
) => {
  const dashboardLink = `${process.env.NEXT_PUBLIC_DOMAIN}/teacher/students`

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: `Nuevo estudiante inscrito: ${data.studentName}`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.primary,
      headerTitle: '👤 Nuevo estudiante',
      headerSubtitle: 'Un nuevo estudiante se ha inscrito en tu curso',
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Hola ${data.teacherName},</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Te informamos que tienes un nuevo estudiante inscrito.</p>

        <div style="background-color: ${EMAIL_COLORS.primarySoft}; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${EMAIL_COLORS.primary};">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Estudiante</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: ${EMAIL_COLORS.text};">${data.studentName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Curso</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.body};">${data.courseName}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Fecha de inscripción</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.body};">${data.enrollmentDate}</p>
          </div>
          ${
            data.studentScheduleSummary
              ? `
          <div style="margin-top: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Horario del estudiante</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.body};">${data.studentScheduleSummary}</p>
          </div>
          `
              : ''
          }
        </div>

        <div style="text-align: center; margin: 24px 0 0 0;">
          <a href="${dashboardLink}" style="${emailButtonStyle(EMAIL_COLORS.dark)}">Ver mis estudiantes</a>
        </div>
      `,
    }),
  })
}

export const sendEnrollmentConfirmationStudentEmail = async (
  email: string,
  data: EnrollmentConfirmationStudentEmailData
) => {
  const dashboardLink = `${process.env.NEXT_PUBLIC_DOMAIN}/dashboard`
  const hasFirstClass = Boolean(data.firstClassDate && data.firstClassTime)
  const isAsynchronousCourse = data.isSynchronousCourse === false
  const introCopy = hasFirstClass
    ? 'Esta es la información de tu primera clase en tu hora local:'
    : isAsynchronousCourse
      ? 'Este curso es asíncrono, así que ya puedes empezar a avanzar a tu propio ritmo desde tu dashboard.'
      : 'Tu equipo académico te compartirá pronto el detalle de tu primera clase.'
  const pendingDetailsCopy = isAsynchronousCourse
    ? 'Este curso no incluye una primera clase en vivo. Ya puedes acceder a tu contenido desde el dashboard.'
    : 'Te avisaremos por este medio apenas se confirme el horario.'

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: `Confirmación de inscripción: ${data.courseName}`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.success,
      headerTitle: '¡Inscripción confirmada!',
      headerSubtitle: 'Tu inscripción fue registrada correctamente',
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Hola ${data.studentName},</h3>
        <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Te confirmamos que ya estás inscrito(a) en <strong>${data.courseName}</strong>.</p>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">${introCopy}</p>

        <div style="background-color: ${EMAIL_COLORS.successSoft}; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${EMAIL_COLORS.success};">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Curso</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: ${EMAIL_COLORS.text};">${data.courseName}</p>
          </div>
          ${
            data.teacherName
              ? `
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Profesor/a</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.body};">${data.teacherName}</p>
          </div>
          `
              : ''
          }
          ${
            hasFirstClass
              ? `
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Primera clase</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.body};">${data.firstClassDate}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Hora</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: ${EMAIL_COLORS.success};">${data.firstClassTime}</p>
          </div>
          `
              : `
          <div>
            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">${pendingDetailsCopy}</p>
          </div>
          `
          }
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${dashboardLink}" style="${emailButtonStyle(EMAIL_COLORS.dark)}">Ir a mi Dashboard</a>
        </div>

        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      `,
    }),
  })
}

interface NewPurchaseAdminEmailData {
  customerName: string
  customerEmail: string
  productName: string
  amount: number
  currency: string
  invoiceNumber: string
  purchaseDate: string
}

export const sendNewPurchaseAdminEmail = async (data: NewPurchaseAdminEmailData) => {
  const adminLink = `${process.env.NEXT_PUBLIC_DOMAIN}/admin/invoices`

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: 'info@lingowow.com',
    subject: `💰 Nueva compra: ${data.customerName} - $${data.amount.toFixed(2)}`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.success,
      headerTitle: '💰 Nueva compra',
      headerSubtitle: 'Se ha registrado un nuevo pago',
      footerText: 'Notificación automática del sistema de ventas de Lingowow',
      bodyHtml: `
        <div style="background-color: ${EMAIL_COLORS.canvas}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Cliente</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text}; font-weight: bold;">${data.customerName}</p>
            <p style="margin: 2px 0 0 0; font-size: 14px; color: ${EMAIL_COLORS.muted};">${data.customerEmail}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Producto</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${data.productName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Monto</p>
            <p style="margin: 4px 0 0 0; font-size: 24px; color: ${EMAIL_COLORS.success}; font-weight: bold;">$${data.amount.toFixed(2)} ${data.currency}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Factura</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${data.invoiceNumber}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Fecha</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${data.purchaseDate}</p>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0 0 0;">
          <a href="${adminLink}" style="${emailButtonStyle(EMAIL_COLORS.success)}">Ver Facturas</a>
        </div>
      `,
    }),
  })
}

export const sendContactFormEmail = async (data: ContactFormData) => {
  const subjectLabels: Record<string, string> = {
    informacion: 'Información General',
    cursos: 'Consulta sobre Cursos',
    precios: 'Precios y Planes',
    'clase-prueba': 'Clase de Prueba',
    soporte: 'Soporte Técnico',
    otro: 'Otro',
  }

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: 'info@lingowow.com',
    replyTo: data.email,
    subject: `[Contacto Web] ${subjectLabels[data.subject] || data.subject} - ${data.name}`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.indigo,
      headerTitle: 'Nuevo mensaje de contacto',
      footerText: 'Mensaje enviado desde el formulario de contacto de lingowow.com',
      bodyHtml: `
        <div style="background-color: ${EMAIL_COLORS.canvas}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Nombre</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${data.name}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Email</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};"><a href="mailto:${data.email}" style="color: ${EMAIL_COLORS.primary}; text-decoration: none;">${data.email}</a></p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Teléfono</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${data.phone}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Asunto</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.text};">${subjectLabels[data.subject] || data.subject}</p>
          </div>
        </div>

        <div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Mensaje</p>
          <div style="background-color: ${EMAIL_COLORS.surface}; border: 1px solid ${EMAIL_COLORS.border}; border-radius: 12px; padding: 16px;">
            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body}; white-space: pre-wrap;">${data.message}</p>
          </div>
        </div>
      `,
    }),
  })

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: data.email,
    subject: 'Hemos recibido tu mensaje - Lingowow',
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.primary,
      headerTitle: '¡Mensaje recibido!',
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Hola ${data.name},</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Gracias por contactarnos. Hemos recibido tu mensaje y te responderemos en menos de 24 horas.</p>

        <div style="background-color: ${EMAIL_COLORS.canvas}; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_COLORS.muted};">Tu mensaje:</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.body}; font-style: italic;">"${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}"</p>
        </div>

        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted};">Si necesitas una respuesta más rápida, puedes contactarnos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      `,
    }),
  })
}

// =============================================
// EMAILS DE PLACEMENT TEST
// =============================================

interface PlacementTestResultEmailData {
  userName: string
  language: string
  level: string
  levelDescription: string
  score: number
  completedAt: string
}

const LEVEL_COLORS: Record<string, string> = {
  A1: '#22c55e',
  A2: '#84cc16',
  B1: '#eab308',
  B2: '#f97316',
  C1: '#ef4444',
  C2: '#a855f7',
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'Inglés',
  es: 'Español',
  fr: 'Francés',
  de: 'Alemán',
  pt: 'Portugués',
  it: 'Italiano',
}

export const sendPaymentLinkEmail = async (params: {
  email: string
  name: string
  planName: string
  paymentUrl: string
  price: string
}) => {
  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: params.email,
    subject: `Tu link de pago para ${params.planName} - Lingowow`,
    html: renderEmailLayout({
      headerBackgroundColor: EMAIL_COLORS.primarySoft,
      headerTitle: 'Completa tu inscripción',
      headerSubtitle: 'Un paso más para comenzar tu aprendizaje de inglés',
      headerTitleColor: EMAIL_COLORS.text,
      headerSubtitleColor: EMAIL_COLORS.muted,
      bodyHtml: `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Hola ${params.name},</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">Has seleccionado el plan <strong>${params.planName}</strong> por <strong>${params.price}</strong>. Haz clic en el botón de abajo para completar tu pago de forma segura a través de PayPal.</p>
        <div style="background-color: ${EMAIL_COLORS.primarySoft}; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid ${EMAIL_COLORS.primary};">
          <p style="margin: 0; font-size: 14px; color: ${EMAIL_COLORS.primary}; font-weight: bold;">¿Qué incluye tu plan?</p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${EMAIL_COLORS.primary}; font-size: 14px; line-height: 1.6;">
            <li>Clases 1 a 1 en vivo con profesores certificados</li>
            <li>Acceso a la plataforma Lingowow</li>
            <li>Seguimiento personalizado de tu progreso</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${params.paymentUrl}" style="${emailButtonStyle(EMAIL_COLORS.primary)}">Completar Pago con PayPal</a>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Una vez completado el pago, recibirás una confirmación y tu inscripción quedará activa.</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      `,
    }),
  })
}

export const sendPlacementTestResultEmail = async (
  email: string,
  data: PlacementTestResultEmailData
) => {
  const coursesLink = `${process.env.NEXT_PUBLIC_DOMAIN}/courses`
  const levelColor = LEVEL_COLORS[data.level] || '#3b82f6'
  const languageName = LANGUAGE_NAMES[data.language] || data.language

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: `🎉 Tu resultado del Test de Clasificación de ${languageName}: Nivel ${data.level}`,
    html: renderEmailLayout({
      headerBackgroundColor: levelColor,
      headerTitle: '🎉 ¡Test completado!',
      headerSubtitle: `Test de Clasificación de ${languageName}`,
      bodyHtml: `
        <h3 style="margin: 0 0 20px 0; font-size: 18px; color: ${EMAIL_COLORS.text};">Hola ${data.userName},</h3>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.body};">¡Felicitaciones por completar tu test de clasificación! Aquí están tus resultados:</p>

        <div style="background-color: ${EMAIL_COLORS.canvas}; border-radius: 16px; padding: 30px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_COLORS.muted}; text-transform: uppercase; letter-spacing: 1px;">Tu nivel de ${languageName}</p>
          <div style="display: inline-block; background-color: ${levelColor}; color: #ffffff; font-size: 48px; font-weight: bold; padding: 16px 32px; border-radius: 12px; margin: 12px 0;">
            ${data.level}
          </div>
          <p style="margin: 16px 0 0 0; font-size: 18px; color: ${EMAIL_COLORS.body}; font-weight: 500; line-height: 1.6;">${data.levelDescription}</p>
        </div>

        <div style="background-color: ${EMAIL_COLORS.canvas}; border-radius: 12px; padding: 20px; margin: 20px 0;">
          ${renderSummaryRows([
            {
              label: 'Puntaje obtenido:',
              value: `${Math.round(data.score)}%`,
              valueColor: EMAIL_COLORS.text,
            },
            {
              label: 'Fecha del test:',
              value: data.completedAt,
              valueColor: EMAIL_COLORS.text,
            },
          ])}
        </div>

        <div style="background-color: ${EMAIL_COLORS.primarySoft}; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${EMAIL_COLORS.primary};">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_COLORS.primary}; font-weight: bold;">¿Qué sigue?</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.primary};">Basándonos en tu nivel ${data.level}, te recomendamos explorar nuestros cursos diseñados específicamente para ti. ¡Comienza tu viaje de aprendizaje hoy!</p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${coursesLink}" style="${emailButtonStyle(EMAIL_COLORS.dark)}">Ver Cursos Recomendados</a>
        </div>

        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.muted}; text-align: center;">¿Tienes preguntas? Contáctanos por <a href="https://wa.me/51902518947" style="color: ${EMAIL_COLORS.primary}; text-decoration: none; font-weight: bold;">WhatsApp</a> o escríbenos a info@lingowow.com</p>
      `,
    }),
  })
}
