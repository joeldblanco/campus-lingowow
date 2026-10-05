import { ACTIONS, STATUS } from 'react-joyride'

export function shouldPersistTourCompletion(status: string, action: string): boolean {
  return status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE
}
