export type ChatRole = 'user' | 'model'

export interface ChatMessage {
  role: ChatRole
  content: string
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
  }
  error?: string
}
