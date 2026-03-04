import { sendTelegramMessage } from '@/lib/telegram'
import type { ToolResult } from '@/types/ai-chat'

export async function handleNotifyAdmin(params: {
  userName: string
  userEmail: string
  userPhone: string
  desiredProgram: string
  desiredSchedule: string
  message: string
}): Promise<ToolResult> {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const text =
    `🔔 <b>Solicitud de asistencia - Asistente IA</b>\n\n` +
    `👤 <b>Usuario:</b> ${esc(params.userName)}\n` +
    `📧 <b>Email:</b> ${esc(params.userEmail)}\n` +
    `📱 <b>Teléfono:</b> ${esc(params.userPhone)}\n` +
    `📚 <b>Interés:</b> ${esc(params.desiredProgram)}\n` +
    `🕐 <b>Horario preferido:</b> ${esc(params.desiredSchedule)}\n\n` +
    `💬 <b>Contexto:</b>\n${esc(params.message)}\n\n` +
    `⚠️ <i>Por favor contactar al usuario para coordinar disponibilidad.</i>`

  const sent = await sendTelegramMessage(text)

  if (sent) {
    return {
      success: true,
      message:
        'Hemos notificado a nuestro equipo de administración con tu información de contacto y preferencias. Se pondrán en contacto contigo pronto. También puedes escribirnos directamente por WhatsApp al +51 902 518 947.',
    }
  }

  return {
    success: false,
    message:
      'No se pudo notificar al equipo en este momento. Por favor escríbenos directamente por WhatsApp al +51 902 518 947 y con gusto te atenderemos.',
  }
}
