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
        <p style="font-size: 14px; color: #6b7280; text-align:center;">Si no has sido tú quien se ha registrado, puedes ignorar este correo.</p>
      </div>
      <div style="padding: 10px 10px 20px 10px; background-color: #f9fafb; text-align: center; font-size: 14px; color: #6b7280;">
        Go wow with us! 🚀
      </div>
    </div>`,
  })
}

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.NEXT_PUBLIC_DOMAIN}/auth/new-password?token=${token}`

  await resend.emails.send({
    from: 'hello@lingowow.com',
    to: email,
    subject: 'Reestablece tu contraseña',
    text: `Hola! Para reestablecer tu contraseña, haz click en el siguiente enlace: ${resetLink}`,
  })
}
