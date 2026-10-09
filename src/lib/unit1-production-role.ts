import type { Block } from '@/types/course-builder'
export type Unit1ProductionRole = 'sentences' | 'conversation' | 'profile' | 'presentation'
export function getUnit1ProductionRole(block: Block): Unit1ProductionRole | null {
  if (block.type === 'recording' && block.data?.learningRevision === 'course-guided-v1' && block.data?.guidedRole === 'conversation') return 'conversation'
  const role = block.data?.unit1Role
  if ((role === 'sentences' || role === 'profile') && block.type === 'essay') return role
  if ((role === 'conversation' || role === 'presentation') && block.type === 'recording') return role
  return null
}
export function isUnit1ProductionBlock(block: Block): boolean {
  return getUnit1ProductionRole(block) !== null
}
