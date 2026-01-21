import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Process HTML content to make all links open in new tab
export function processHtmlLinks(html: string): string {
  if (!html) return html
  
  // Replace <a> tags to add target="_blank" and rel="noopener noreferrer"
  return html.replace(
    /<a\s+([^>]*?)href=/gi,
    (match, existingAttrs) => {
      // Check if target is already set
      if (/target\s*=/i.test(existingAttrs)) {
        return match
      }
      return `<a ${existingAttrs}target="_blank" rel="noopener noreferrer" href=`
    }
  )
}

// Format file size in human-readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Format date in human-readable format
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

// Format number with thousand separators
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

// Generate DiceBear avatar URL based on user ID
export function getDiceBearAvatar(userId: string, style: 'initials' | 'avataaars' | 'bottts' | 'lorelei' | 'notionists' = 'lorelei'): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(userId)}`
}

// Get user avatar URL - returns user image if exists, otherwise DiceBear
export function getUserAvatarUrl(userId: string, userImage?: string | null): string {
  if (userImage) return userImage
  return getDiceBearAvatar(userId)
}
