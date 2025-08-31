// File management types
export interface UploadedFile {
  id: string
  public_id: string
  secure_url: string
  format: string
  resource_type: string
  bytes: number
  created_at: string
  folder: string
}

export interface FileUploadResult {
  public_id: string
  secure_url: string
  format?: string
  resource_type?: string
  bytes?: number
  created_at?: string
}
