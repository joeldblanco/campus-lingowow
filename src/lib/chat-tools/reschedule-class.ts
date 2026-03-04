import { studentRescheduleClass } from '@/lib/actions/student-schedule'
import type { ToolResult } from '@/types/ai-chat'

export async function handleRescheduleClass(
  params: { bookingId: string; newDay: string; newTimeSlot: string }
): Promise<ToolResult> {
  try {
    const result = await studentRescheduleClass({
      bookingId: params.bookingId,
      newDay: params.newDay,
      newTimeSlot: params.newTimeSlot,
    })

    if (result.success) {
      return {
        success: true,
        message: `La clase ha sido reagendada correctamente para el ${params.newDay} en el horario ${params.newTimeSlot} (hora local). Recibirás una confirmación.`,
      }
    }

    // Map internal error messages to user-friendly messages
    const errorMap: Record<string, string> = {
      'Not authenticated': 'No tienes autorización para realizar esta acción.',
      'Booking not found or does not belong to this student':
        'No se encontró la clase o no te pertenece.',
      'Only confirmed bookings can be rescheduled':
        'Solo se pueden reagendar clases con estado confirmado.',
      'Class has already been rescheduled':
        'Esta clase ya fue reagendada anteriormente. Solo se permite reagendar una vez por clase.',
      'Cannot reschedule with less than':
        'No es posible reagendar con menos de 1 hora de anticipación.',
      'Maximum reschedules exceeded': 'Se ha alcanzado el límite de reagendamientos.',
    }

    const errorMessage = result.error ?? 'Error desconocido'
    const friendlyMessage =
      Object.entries(errorMap).find(([key]) => errorMessage.includes(key))?.[1] ??
      `No se pudo reagendar la clase: ${errorMessage}`

    return { success: false, message: friendlyMessage }
  } catch (error) {
    console.error('[RescheduleClass] Error:', error)
    return {
      success: false,
      message: 'Ocurrió un error al reagendar la clase. Por favor intenta de nuevo.',
    }
  }
}
