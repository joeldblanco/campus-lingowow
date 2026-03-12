import { describe, expect, it } from 'vitest'
import { formatFileSize } from './utils'

describe('formatFileSize', () => {
  it('should format 0 bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('should format bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 Bytes')
    expect(formatFileSize(1023)).toBe('1023 Bytes')
  })

  it('should format KB correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(1024 * 1024 - 1)).toBe('1024 KB')
  })

  it('should format MB correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB')
    expect(formatFileSize(1024 * 1024 * 2.34)).toBe('2.34 MB')
  })

  it('should format GB correctly', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    expect(formatFileSize(1024 * 1024 * 1024 * 1.5)).toBe('1.5 GB')
    expect(formatFileSize(1024 * 1024 * 1024 * 5.67)).toBe('5.67 GB')
  })

  it('should format TB correctly', () => {
    expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB')
    expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 1.5)).toBe('1.5 TB')
    expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 9.99)).toBe('9.99 TB')
  })
})
