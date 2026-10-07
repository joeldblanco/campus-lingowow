import type { Block } from '@/types/course-builder'
export type Unit1ProductionRole = 'sentences' | 'conversation' | 'profile' | 'presentation'
export function getUnit1ProductionRole(block: Block): Unit1ProductionRole | null {
  const role = block.data?.unit1Role
  if ((role === 'sentences' || role === 'profile') && block.type === 'essay') return role
  if ((role === 'conversation' || role === 'presentation') && block.type === 'recording') return role
  return null
}
export function isUnit1ProductionBlock(block: Block): boolean {
  return getUnit1ProductionRole(block) !== null
}
