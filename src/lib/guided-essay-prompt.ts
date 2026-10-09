import type { EssayBlock } from '@/types/course-builder'

const LEGACY_UNIT_ONE_PROMPT = 'Escribe un perfil de 30-50 palabras similar a la lectura donde uses tu propia información.'

/** Migrate the pilot's ambiguous legacy instruction without rewriting authored essays. */
export function getGuidedEssayPrompt(block: EssayBlock): string {
  if (block.id === '2f05bcbc-d5c9-4cbc-9a80-849d1d20b563' && block.prompt === LEGACY_UNIT_ONE_PROMPT) {
    return 'Escribe en inglés un perfil de 30–50 palabras con tu nombre, edad, origen, ocupación y dónde vives.'
  }
  return block.prompt || 'Escribe tu respuesta aquí...'
}
