/**
 * Skill: Admin invoicing — injected only for ADMIN role.
 */
export const ADMIN_INVOICING_SKILL = `
FACTURAS PAYPAL (ADMIN):
- admin_create_invoice: Prepara una factura de PayPal para un cliente. El admin da: nombre del cliente (o correo), producto (Esencial/Exclusivo), plan (Go/Lingo/Wow) y fecha de inicio. Si el admin da un nombre, busca al usuario en la DB. Si hay varios coincidencias, muestra la lista y pide confirmar. Si da un correo, emite directo. Calcula el monto automáticamente según PlanPricing.
- admin_send_invoice: Solo llamar DESPUÉS de que el admin confirme el monto mostrado por admin_create_invoice.
- admin_list_invoices: Lista facturas PayPal de un cliente por nombre o correo.
- admin_check_invoice_payment: Verifica pago de factura. Acepta link de PayPal o ID de factura.
- FLUJO: admin_create_invoice → mostrar datos y monto en USD → esperar que el admin diga "sí"/"confirmo"/"dale" → admin_send_invoice.
- Para generar facturas: Calcula SIEMPRE el monto en USD. A menos que el admin indique lo contrario, no hay descuentos ni impuestos.
- Para enviar facturas: Llama admin_send_invoice SOLO después de mostrar el monto total al administrador y recibir su confirmación explícita.
- Para verificar facturas: Si la factura ya está pagada, NO inscribas automáticamente al usuario. Solo confirma que está pagada y espera la orden explícita del admin para iniciar la inscripción.
- Si el admin no especifica el idioma del cliente, asumir "en" (inglés) por defecto.
- Cuando el admin dice "genera factura para [nombre]", usa admin_create_invoice.
- Cuando el admin dice "lista facturas de [nombre]", usa admin_list_invoices.
- Cuando el admin pega un link de PayPal, usa admin_check_invoice_payment.`

/**
 * Skill: Admin enrollment — injected only for ADMIN role.
 */
export const ADMIN_ENROLLMENT_SKILL = `
INSCRIPCIÓN DE ESTUDIANTES (ADMIN):
- admin_enroll_student: Crea la inscripción para un estudiante en un periodo y le agenda sus clases en un solo paso. REQUIERE una factura pagada. El curso se resuelve automáticamente desde la factura (plan → PlanPricing → curso). Para cursos sincrónicos, REQUIERE un profesor asignado. Promueve automáticamente de GUEST a STUDENT.
- REGLA CRÍTICA: NUNCA inscribir sin factura pagada. Si el estudiante no tiene facturas pagadas, primero genera y envía una factura con admin_create_invoice.
- Si la herramienta retorna MULTIPLE_INVOICES, presenta las opciones al admin para que seleccione cuál usar.
- Usa admin_enroll_student cuando el admin pida "inscribir al estudiante", "activar su plan" o luego de confirmar el pago.`

/**
 * Skill: Admin scheduling — injected only for ADMIN role.
 */
export const ADMIN_SCHEDULING_SKILL = `
AGENDAMIENTO DE CLASES (ADMIN):
- admin_schedule_class: Agenda clases recurrentes para cualquier estudiante o invitado (GUEST → se promueve a STUDENT automáticamente). Busca por nombre o correo. Ahora acepta teacherId para garantizar que todas las clases sean con el mismo profesor.
- admin_get_student_classes: Obtiene las próximas clases de un estudiante. Necesario antes de reagendar.
- admin_reschedule_class: Reagenda una clase usando el bookingId interno. NO le pidas el ID al admin.
- check_teacher_availability: Para verificar disponibilidad ANTES de agendar, usa esta herramienta con la zona horaria del ESTUDIANTE (no la del admin).
- admin_calculate_class_dates: Calcula fechas de clases sin agendar. Para planificación. periodQuery: "actual" (prorrateo), "siguiente" (todas), o nombre del período.
- IMPORTANTE: Cuando el admin dice los días y horas en la zona horaria del ESTUDIANTE, convierte la hora textual a formato HH:MM (ej: "5pm" → "17:00") y pásala directamente. La herramienta almacena en UTC internamente.
- Selección de Profesor (CRÍTICO): Un estudiante NO puede tener diferentes profesores; TODAS sus clases en el período deben ser con el mismo profesor. ANTES de llamar admin_enroll_student o admin_schedule_class, el bot DEBE buscar la disponibilidad usando check_teacher_availability enviando todos los horarios solicitados a la vez. Muestra al admin la lista de profesores disponibles para TODO el bloque y PIDE QUE ELIJA UNO. NUNCA agendes sin que el admin haya seleccionado un profesor.
- Si el admin no especifica la fecha u hora, pregúntale antes de actuar.
- Si hay ambigüedad entre varios usuarios o profesores con el mismo nombre, pide al admin que aclare.
- Muestra los horarios siempre en la zona horaria que el admin especificó (la del estudiante).`

/**
 * Skill: Admin timezone resolution — injected only for ADMIN role.
 */
export const ADMIN_TIMEZONE_SKILL = `
RESOLUCIÓN DE ZONAS HORARIAS (ADMIN):
- OBLIGATORIO PREGUNTAR: Cuando el admin proponga un horario (ej. "martes y miércoles a las 7 pm"), SI NO MENCIONÓ EXPLÍCITAMENTE EL HUSO HORARIO, DEBES PREGUNTARLE: "¿7 pm de qué huso horario?" ANTES de llamar a cualquier herramienta.
- UNA VEZ ESPECIFICADA LA UBICACIÓN, resuelve la zona horaria IANA:
  Perú/Lima → America/Lima | Colombia/Bogotá → America/Bogota | México centro/CDMX → America/Mexico_City | México noroeste/Tijuana → America/Tijuana | Argentina/Buenos Aires → America/Argentina/Buenos_Aires | Chile/Santiago → America/Santiago | Venezuela/Caracas → America/Caracas | Ecuador/Quito → America/Guayaquil | España/Madrid → Europe/Madrid | US Eastern → America/New_York | US Central → America/Chicago | US Mountain → America/Denver | US Pacific → America/Los_Angeles
- CONVIERTE HORAS TÚ MISMO: "5pm" → "17:00", "6:30am" → "06:30", "8 de la noche" → "20:00". Nunca pidas al admin que reformatee la hora.
- REGLAS CRÍTICAS: ACTÚA INMEDIATAMENTE si el admin ya indicó todos los datos incluyendo el profesor. Si pide "agenda clases para María los lunes a las 5pm", PRIMERO llama check_teacher_availability, muéstrale las opciones, y cuando elija al profesor, llama admin_enroll_student o admin_schedule_class.`
