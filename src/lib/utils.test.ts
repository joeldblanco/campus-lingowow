import { describe, it, expect } from 'vitest'
import {
  processHtmlLinks,
  formatFileSize,
  formatDate,
  formatNumber,
  getDiceBearAvatar,
  getUserAvatarUrl,
} from './utils'

describe('processHtmlLinks', () => {
  it('should add target="_blank" and rel="noopener noreferrer" to a simple link', () => {
    const html = '<a href="https://example.com">Link</a>'
    const result = processHtmlLinks(html)
    expect(result).toBe(
      '<a target="_blank" rel="noopener noreferrer" href="https://example.com">Link</a>'
    )
  })

  it('should handle links with existing attributes', () => {
    const html = '<a class="link" href="https://example.com">Link</a>'
    const result = processHtmlLinks(html)
    expect(result).toBe(
      '<a class="link" target="_blank" rel="noopener noreferrer" href="https://example.com">Link</a>'
    )
  })

  it('should not modify links that already have a target attribute', () => {
    const html = '<a target="_self" href="https://example.com">Link</a>'
    const result = processHtmlLinks(html)
    expect(result).toBe(html)
  })

  it('should handle multiple links in the same string', () => {
    const html = '<a href="url1">Link 1</a> and <a href="url2">Link 2</a>'
    const result = processHtmlLinks(html)
    expect(result).toBe(
      '<a target="_blank" rel="noopener noreferrer" href="url1">Link 1</a> and <a target="_blank" rel="noopener noreferrer" href="url2">Link 2</a>'
    )
  })

  it('should handle case-insensitive tags and attributes', () => {
    const html = '<A HREF="https://example.com">Link</A>'
    const result = processHtmlLinks(html)
    expect(result).toBe(
      '<a target="_blank" rel="noopener noreferrer" href="https://example.com">Link</A>'
    )
  })

  it('should return original string if no links are present', () => {
    const html = '<p>Just some text</p>'
    const result = processHtmlLinks(html)
    expect(result).toBe(html)
  })

  it('should handle empty or null input gracefully', () => {
    expect(processHtmlLinks('')).toBe('')
    expect(processHtmlLinks(null as unknown as string)).toBeNull()
    expect(processHtmlLinks(undefined as unknown as string)).toBeUndefined()
  })

  it('should handle links with multiline attributes', () => {
    const html = `<a \n      class="link"\n      href="https://example.com">Link</a>`
    const result = processHtmlLinks(html)
    expect(result).toBe(
      `<a class="link"\n      target="_blank" rel="noopener noreferrer" href="https://example.com">Link</a>`
    )
  })
})

describe('formatFileSize', () => {
  it('should return "0 Bytes" for 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('should format bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 Bytes')
  })

  it('should format kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('should format megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1572864)).toBe('1.5 MB')
  })

  it('should format gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB')
  })

  it('should format terabytes correctly', () => {
    expect(formatFileSize(1099511627776)).toBe('1 TB')
  })
})

describe('formatDate', () => {
  it('should format Date object correctly', () => {
    const date = new Date('2023-01-15T10:30:00Z')
    const result = formatDate(date)
    expect(result).toContain('2023')
  })

  it('should format date string correctly', () => {
    const result = formatDate('2023-01-15T10:30:00Z')
    expect(result).toContain('2023')
  })
})

describe('formatNumber', () => {
  it('should format numbers with thousands separators', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1000000)).toBe('1,000,000')
    expect(formatNumber(1234.56)).toBe('1,234.56')
  })
})

describe('getDiceBearAvatar', () => {
  it('should return correct URL for default style', () => {
    const url = getDiceBearAvatar('user123')
    expect(url).toBe('https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=user123')
  })

  it('should return correct URL for specific style', () => {
    const url = getDiceBearAvatar('user123', 'avataaars')
    expect(url).toBe('https://api.dicebear.com/9.x/avataaars/svg?seed=user123')
  })

  it('should URI encode the seed', () => {
    const url = getDiceBearAvatar('user with spaces')
    expect(url).toBe('https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=user%20with%20spaces')
  })
})

describe('getUserAvatarUrl', () => {
  it('should return userImage if provided', () => {
    const url = getUserAvatarUrl('user123', 'https://example.com/image.png')
    expect(url).toBe('https://example.com/image.png')
  })

  it('should return DiceBear avatar if userImage is null', () => {
    const url = getUserAvatarUrl('user123', null)
    expect(url).toBe('https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=user123')
  })

  it('should return DiceBear avatar if userImage is undefined', () => {
    const url = getUserAvatarUrl('user123')
    expect(url).toBe('https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=user123')
  })
})
