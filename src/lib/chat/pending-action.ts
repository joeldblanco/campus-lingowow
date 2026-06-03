/**
 * Detects "pre-action" assistant text — the model announcing it is ABOUT to do
 * something ("voy a verificar…", "agendaré la clase…", "procederé a…") instead
 * of actually calling the function. When this matches, the chat route nudges the
 * model to call a function immediately rather than ending the turn with a
 * promise it never fulfils.
 *
 * Kept as a standalone pure helper so the matching can be unit-tested in
 * isolation (the route handler itself depends on the Gemini client).
 *
 * Only FUTURE-tense / in-progress phrasings are matched ("agendaré", not the
 * past-tense "agendé" which means the action already happened and must NOT be
 * re-nudged).
 *
 * Note: no trailing `\b` — JS word boundaries are ASCII-only, so a `\b` placed
 * right after an accented vowel (e.g. the "é" in "agendaré") never matches and
 * would silently drop every accented future-tense verb.
 */
export const PENDING_ACTION_RE =
  /\b(verificar[eé]|comprobar[eé]|revisar[eé]|consultar[eé]|buscar[eé]|proceder[eé]|agendar[eé]|reagendar[eé]|agregar[eé]|a[ñn]adir[eé]|crear[eé]|programar[eé]|registrar[eé]|inscribir[eé]|un momento|un segundo|un segundito|un momentito|voy a|déjame|dejame|ahora mismo|enseguida|procedo|procederé|generar[eé]|let me|will check|will schedule|scheduling|checking|necesito saber|necesito la|para confirmar|para poder|podrías indicar|podrias indicar|no tengo acceso|no puedo ver|indicame|indícame|dime cu[aá]l)/

export function looksLikePendingAction(text: string): boolean {
  return PENDING_ACTION_RE.test(text.toLowerCase())
}
