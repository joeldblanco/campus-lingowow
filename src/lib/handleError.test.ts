import { describe, it, expect } from 'vitest'
import handleError from './handleError'

describe('Error Handling Utils', () => {
  it('should extract message from Error object', () => {
    const error = new Error('Something went wrong')
    expect(handleError(error)).toBe('Something went wrong')
  })

  it('should extract message from object with message property', () => {
    const error = { message: 'Custom error message' }
    expect(handleError(error)).toBe('Custom error message')
  })

  it('should return default message for unknown error', () => {
    expect(handleError('string error')).toBe('Error desconocido')
    expect(handleError(123)).toBe('Error desconocido')
    expect(handleError(true)).toBe('Error desconocido')
  })

  it('should return default message for null or undefined', () => {
    expect(handleError(null)).toBe('Error desconocido')
    expect(handleError(undefined)).toBe('Error desconocido')
  })

  it('should handle objects without message property', () => {
    const error = { code: 500, status: 'error' }
    expect(handleError(error)).toBe('Error desconocido')
  })

  it('should handle TypeError', () => {
    const error = new TypeError('Type error occurred')
    expect(handleError(error)).toBe('Type error occurred')
  })

  it('should handle RangeError', () => {
    const error = new RangeError('Range error occurred')
    expect(handleError(error)).toBe('Range error occurred')
  })

  it('should handle custom error classes', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'CustomError'
      }
    }

    const error = new CustomError('Custom error message')
    expect(handleError(error)).toBe('Custom error message')
  })

  it('should handle empty error message', () => {
    const error = new Error('')
    expect(handleError(error)).toBe('')
  })

  it('should handle error with numeric message', () => {
    const error = { message: 404 }
    expect(handleError(error)).toBe(404)
  })
})
