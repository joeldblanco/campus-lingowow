// Types for the shared content builder

export type ContentBuilderMode = 'lesson' | 'exam'

export interface ContentBuilderConfig {
  mode: ContentBuilderMode
  showPoints?: boolean          // Show points for interactive blocks (exam mode)
  showValidationErrors?: boolean // Show validation errors on blocks
  allowedBlockTypes?: string[]  // Filter which block types are available
  excludedBlockTypes?: string[] // Exclude specific block types
}

export interface BlockValidationError {
  blockId: string
  blockIndex: number
  field: string
  message: string
}
