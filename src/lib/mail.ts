import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmLink = `${process.env.NEXT_PUBLIC_DOMAIN}/auth/new-verification?token=${token}`

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: 'Confirma tu correo electrónico',
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #f3f4f6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #111827;">Confirmación de registro</h2>
        <p style="color: #6b7280; font-size: 14px;">Confirma tu dirección de correo electrónico para acceder a todas las funcionalidades de Lingowow.</p>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">¡Bienvenido a bordo!</h3>
        <p style="font-size: 16px; color: #374151;">Gracias por registrarte en Lingowow. Haz clic en el botón de abajo para confirmar tu cuenta.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${confirmLink}" style="display: inline-block; background-color: #020617; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px;">Validar correo electrónico</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; text-align:center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
        <p style="font-size: 14px; color: #6b7280; text-align:center;">Si no has sido tú quien se ha registrado, puedes ignorar este correo.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
  })
}

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const confirmLink = `${process.env.NEXT_PUBLIC_DOMAIN}/auth/new-password?token=${token}`

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: 'Recupera tu contraseña',
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #f3f4f6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #111827;">Recupera tu contraseña</h2>
        <p style="color: #6b7280; font-size: 14px;">Recupera tu contraseña para acceder a todas las funcionalidades de Lingowow.</p>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">Recupera tu contraseña</h3>
        <p style="font-size: 16px; color: #374151;">Recupera tu contraseña para acceder a todas las funcionalidades de Lingowow. Haz clic en el botón de abajo para recuperar tu contraseña.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${confirmLink}" style="display: inline-block; background-color: #020617; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px;">Recuperar contraseña</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; text-align:center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
        <p style="font-size: 14px; color: #6b7280; text-align:center;">Si no has sido tú quien ha solicitado la recuperación de tu contraseña, puedes ignorar este correo.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
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
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)} ${data.currency}</td>
    </tr>
  `
    )
    .join('')

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: `¡Gracias por tu compra! - Factura ${data.invoiceNumber}`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #3b82f6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">¡Pago Confirmado!</h2>
        <p style="color: #dbeafe; font-size: 14px; margin-top: 8px;">Tu compra ha sido procesada exitosamente</p>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">Hola ${data.customerName},</h3>
        <p style="font-size: 16px; color: #374151;">Gracias por confiar en Lingowow. Tu pago ha sido procesado correctamente y ya puedes acceder a tus cursos.</p>
        
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Número de factura:</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #111827;">${data.invoiceNumber}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-size: 14px; color: #374151;">Producto</th>
              <th style="padding: 12px; text-align: center; font-size: 14px; color: #374151;">Cant.</th>
              <th style="padding: 12px; text-align: right; font-size: 14px; color: #374151;">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="border-top: 2px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Subtotal:</span>
            <span style="color: #374151;">$${data.subtotal.toFixed(2)} ${data.currency}</span>
          </div>
          ${
            data.discount > 0
              ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #3b82f6;">Descuento:</span>
            <span style="color: #3b82f6;">-$${data.discount.toFixed(2)} ${data.currency}</span>
          </div>
          `
              : ''
          }
          ${
            data.tax > 0
              ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Impuestos:</span>
            <span style="color: #374151;">$${data.tax.toFixed(2)} ${data.currency}</span>
          </div>
          `
              : ''
          }
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <span style="color: #111827;">Total:</span>
            <span style="color: #111827;">$${data.total.toFixed(2)} ${data.currency}</span>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${dashboardLink}" style="display: inline-block; background-color: #020617; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px;">Ir a mi Dashboard</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center;">Si tienes alguna pregunta, no dudes en contactarnos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a> o en info@lingowow.com</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #3b82f6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">¡Tu clase es hoy!</h2>
        <p style="color: #dbeafe; font-size: 14px; margin-top: 8px;">No olvides conectarte a tiempo</p>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">Hola ${data.studentName},</h3>
        <p style="font-size: 16px; color: #374151;">Te recordamos que tienes una clase programada para hoy. ¡Prepárate para aprender!</p>
        
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Curso</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: #111827;">${data.courseName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Profesor/a</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151;">${data.teacherName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Fecha</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151;">${data.classDate}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Hora</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: #3b82f6;">${data.classTime}</p>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.classLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">Unirse a la Clase</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center;">El enlace estará disponible 5 minutos antes de la hora programada.</p>
        <p style="font-size: 14px; color: #6b7280; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #3b82f6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">Nueva Solicitud de Clase de Prueba</h2>
      </div>
      <div style="padding: 20px;">
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Nombre</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${data.name}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Email</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;"><a href="mailto:${data.email}" style="color: #3b82f6;">${data.email}</a></p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Teléfono</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${data.phone}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Idioma de interés</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827; font-weight: bold;">${languageLabels[data.language] || data.language}</p>
          </div>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center;">Contactar en las próximas 24 horas para agendar la clase de prueba.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Solicitud desde el formulario de lingowow.com
      </div>
    </div>`,
  })

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: data.email,
    subject: '¡Recibimos tu solicitud de clase de prueba! - Lingowow',
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #3b82f6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">¡Solicitud Recibida!</h2>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">Hola ${data.name},</h3>
        <p style="font-size: 16px; color: #374151;">¡Gracias por tu interés en aprender ${languageLabels[data.language] || data.language} con nosotros!</p>
        <p style="font-size: 16px; color: #374151;">Hemos recibido tu solicitud de clase de prueba gratuita. Un miembro de nuestro equipo se pondrá en contacto contigo en las próximas 24 horas para coordinar tu sesión.</p>
        
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: bold;">¿Qué incluye tu clase de prueba?</p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #1e40af;">
            <li>Sesión de 30 minutos con un profesor nativo</li>
            <li>Evaluación de tu nivel actual</li>
            <li>Plan de estudio personalizado</li>
            <li>Sin compromiso de compra</li>
          </ul>
        </div>
        
        <p style="font-size: 14px; color: #6b7280;">Si tienes alguna pregunta mientras tanto, puedes contactarnos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #8b5cf6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">¡Créditos Agregados!</h2>
        <p style="color: #e9d5ff; font-size: 14px; margin-top: 8px;">Tu compra ha sido procesada exitosamente</p>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">Hola ${data.customerName},</h3>
        <p style="font-size: 16px; color: #374151;">Gracias por tu compra. Tus créditos ya están disponibles en tu cuenta.</p>
        
        <div style="background-color: #f5f3ff; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Créditos agregados:</p>
          <p style="margin: 0; font-size: 48px; font-weight: bold; color: #8b5cf6;">${data.creditsAmount}</p>
        </div>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Número de factura:</span>
            <span style="color: #111827; font-weight: bold;">${data.invoiceNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280;">Total pagado:</span>
            <span style="color: #111827; font-weight: bold;">$${data.price.toFixed(2)} ${data.currency}</span>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${dashboardLink}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px;">Ver mis créditos</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center;">Puedes usar tus créditos para reservar clases adicionales o acceder a contenido premium.</p>
        <p style="font-size: 14px; color: #6b7280; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #10b981; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">💰 Confirmación de Pago</h2>
        <p style="color: #d1fae5; font-size: 14px; margin-top: 8px;">Un profesor ha confirmado su monto de pago</p>
      </div>
      <div style="padding: 20px;">
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Profesor</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827; font-weight: bold;">${data.teacherName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Email</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;"><a href="mailto:${data.teacherEmail}" style="color: #3b82f6;">${data.teacherEmail}</a></p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Monto Confirmado</p>
            <p style="margin: 4px 0 0 0; font-size: 24px; color: #10b981; font-weight: bold;">$${data.amount.toFixed(2)}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Recibo por Honorarios</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${data.hasProof ? '✅ Adjuntado' : '❌ No adjuntado'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Fecha de Confirmación</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${new Date(data.confirmedAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
          </div>
        </div>
        
        <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: bold;">⚠️ Acción Requerida</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #92400e;">Procesar el pago al profesor y marcar como pagado en el sistema.</p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${adminDashboardLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px;">Ver Panel de Pagos</a>
        </div>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Notificación automática del sistema de pagos de Lingowow
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #3b82f6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">👤 Nuevo Estudiante</h2>
        <p style="color: #dbeafe; font-size: 14px; margin-top: 8px;">Un nuevo estudiante se ha inscrito en tu curso</p>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">Hola ${data.teacherName},</h3>
        <p style="font-size: 16px; color: #374151;">Te informamos que tienes un nuevo estudiante inscrito.</p>
        
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Estudiante</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: #111827;">${data.studentName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Curso</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151;">${data.courseName}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Fecha de inscripción</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151;">${data.enrollmentDate}</p>
          </div>
          ${
            data.studentScheduleSummary
              ? `
          <div style="margin-top: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Horario del estudiante</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151;">${data.studentScheduleSummary}</p>
          </div>
          `
              : ''
          }
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${dashboardLink}" style="display: inline-block; background-color: #020617; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px;">Ver mis estudiantes</a>
        </div>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #10b981; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">¡Inscripción confirmada!</h2>
        <p style="color: #d1fae5; font-size: 14px; margin-top: 8px;">Tu inscripción fue registrada correctamente</p>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">Hola ${data.studentName},</h3>
        <p style="font-size: 16px; color: #374151;">Te confirmamos que ya estás inscrito(a) en <strong>${data.courseName}</strong>.</p>
        <p style="font-size: 16px; color: #374151;">${introCopy}</p>

        <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Curso</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: #111827;">${data.courseName}</p>
          </div>
          ${
            data.teacherName
              ? `
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Profesor/a</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151;">${data.teacherName}</p>
          </div>
          `
              : ''
          }
          ${
            hasFirstClass
              ? `
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Primera clase</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151;">${data.firstClassDate}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Hora</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: #10b981;">${data.firstClassTime}</p>
          </div>
          `
              : `
          <div>
            <p style="margin: 0; font-size: 16px; color: #374151;">${pendingDetailsCopy}</p>
          </div>
          `
          }
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${dashboardLink}" style="display: inline-block; background-color: #020617; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px;">Ir a mi Dashboard</a>
        </div>

        <p style="font-size: 14px; color: #6b7280; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #10b981; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">💰 Nueva Compra</h2>
        <p style="color: #d1fae5; font-size: 14px; margin-top: 8px;">Se ha registrado un nuevo pago</p>
      </div>
      <div style="padding: 20px;">
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Cliente</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827; font-weight: bold;">${data.customerName}</p>
            <p style="margin: 2px 0 0 0; font-size: 14px; color: #6b7280;">${data.customerEmail}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Producto</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${data.productName}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Monto</p>
            <p style="margin: 4px 0 0 0; font-size: 24px; color: #10b981; font-weight: bold;">$${data.amount.toFixed(2)} ${data.currency}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Factura</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${data.invoiceNumber}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Fecha</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${data.purchaseDate}</p>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${adminLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px;">Ver Facturas</a>
        </div>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Notificación automática del sistema de ventas de Lingowow
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #6366f1; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">Nuevo mensaje de contacto</h2>
      </div>
      <div style="padding: 20px;">
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Nombre</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${data.name}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Email</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;"><a href="mailto:${data.email}" style="color: #3b82f6;">${data.email}</a></p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Teléfono</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${data.phone}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Asunto</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #111827;">${subjectLabels[data.subject] || data.subject}</p>
          </div>
        </div>
        
        <div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Mensaje</p>
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
            <p style="margin: 0; font-size: 16px; color: #374151; white-space: pre-wrap;">${data.message}</p>
          </div>
        </div>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Mensaje enviado desde el formulario de contacto de lingowow.com
      </div>
    </div>`,
  })

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: data.email,
    subject: 'Hemos recibido tu mensaje - Lingowow',
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #3b82f6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">¡Mensaje recibido!</h2>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">Hola ${data.name},</h3>
        <p style="font-size: 16px; color: #374151;">Gracias por contactarnos. Hemos recibido tu mensaje y te responderemos en menos de 24 horas.</p>
        
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Tu mensaje:</p>
          <p style="margin: 0; font-size: 14px; color: #374151; font-style: italic;">"${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}"</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280;">Si necesitas una respuesta más rápida, puedes contactarnos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #f3f4f6; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; color: #111827;">Completa tu inscripción</h2>
        <p style="color: #6b7280; font-size: 14px;">Un paso más para comenzar tu aprendizaje de inglés</p>
      </div>
      <div style="padding: 20px;">
        <h3 style="font-size: 18px; color: #111827;">Hola ${params.name},</h3>
        <p style="font-size: 16px; color: #374151;">Has seleccionado el plan <strong>${params.planName}</strong> por <strong>${params.price}</strong>. Haz clic en el botón de abajo para completar tu pago de forma segura a través de PayPal.</p>
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: bold;">¿Qué incluye tu plan?</p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
            <li>Clases 1 a 1 en vivo con profesores certificados</li>
            <li>Acceso a la plataforma Lingowow</li>
            <li>Seguimiento personalizado de tu progreso</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${params.paymentUrl}" style="display: inline-block; background-color: #020617; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">Completar Pago con PayPal</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; text-align: center;">Una vez completado el pago, recibirás una confirmación y tu inscripción quedará activa.</p>
        <p style="font-size: 14px; color: #6b7280; text-align: center;">Si tienes alguna duda, contáctanos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a>.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
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
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 30px; background: linear-gradient(135deg, ${levelColor} 0%, ${levelColor}dd 100%); text-align: center;">
        <h2 style="margin: 0; font-size: 28px; color: #ffffff;">🎉 ¡Test Completado!</h2>
        <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin-top: 8px;">Test de Clasificación de ${languageName}</p>
      </div>
      <div style="padding: 30px;">
        <h3 style="font-size: 18px; color: #111827; margin-bottom: 20px;">Hola ${data.userName},</h3>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          ¡Felicitaciones por completar tu test de clasificación! Aquí están tus resultados:
        </p>
        
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 16px; padding: 30px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Tu nivel de ${languageName}</p>
          <div style="display: inline-block; background-color: ${levelColor}; color: white; font-size: 48px; font-weight: bold; padding: 16px 32px; border-radius: 12px; margin: 12px 0;">
            ${data.level}
          </div>
          <p style="margin: 16px 0 0 0; font-size: 18px; color: #374151; font-weight: 500;">${data.levelDescription}</p>
        </div>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #6b7280;">Puntaje obtenido:</span>
            <span style="color: #111827; font-weight: bold;">${Math.round(data.score)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280;">Fecha del test:</span>
            <span style="color: #111827;">${data.completedAt}</span>
          </div>
        </div>

        <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e40af; font-weight: bold;">¿Qué sigue?</p>
          <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
            Basándonos en tu nivel ${data.level}, te recomendamos explorar nuestros cursos diseñados específicamente para ti. 
            ¡Comienza tu viaje de aprendizaje hoy!
          </p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${coursesLink}" style="display: inline-block; background-color: #020617; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">Ver Cursos Recomendados</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          ¿Tienes preguntas? Contáctanos por <a href="https://wa.me/51902518947" style="color: #3b82f6; text-decoration: none; font-weight: bold;">WhatsApp</a> 
          o escríbenos a info@lingowow.com
        </p>
      </div>
      <div style="padding: 16px 20px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
  })
}
