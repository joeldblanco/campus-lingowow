export type ChatRole = 'user' | 'model'

export interface SelectOption {
  id: string
  label: string
  payload?: Record<string, unknown>
}

export interface ChatInteraction {
  kind: 'single-select'
  prompt: string
  options: SelectOption[]
  allowFreeText: boolean
}

export interface ChatMessage {
  role: ChatRole
  content: string
  interaction?: ChatInteraction
}

export interface AiChatRequest {
  messages: ChatMessage[]
}

export interface ToolResult {
  success: boolean
  message: string
  data?: unknown
}

export interface AiChatResponse {
  success: boolean
  data?: {
    response: string
    toolExecuted?: string
    interaction?: ChatInteraction
  }
  error?: string
}
