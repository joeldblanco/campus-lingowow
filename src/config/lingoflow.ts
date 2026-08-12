export const LINGOFLOW_TARGET_ACTIVE_STUDENTS = 30
export const LINGOFLOW_AI_MODEL = 'gemini-2.5-flash'

// Fase 0: 5 solicitudes por minuto por usuario, en memoria local por proceso.
// El contador se reinicia entre instancias y cold starts; no es un límite distribuido ni global.
// La migración a un store compartido se difiere a la Fase 1.
export const LINGOFLOW_AI_RATE_LIMIT = { windowMs: 60_000, maxRequests: 5 }
