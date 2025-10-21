import { describe, it, expect } from 'vitest'
import { formatCurrency } from './shop'

describe('Shop Utils - Currency Formatting', () => {
  it('should format whole numbers', () => {
    const result1 = formatCurrency(100)
    expect(result1).toContain('100,00')
    expect(result1).toContain('US$')

    const result2 = formatCurrency(1000)
    expect(result2).toContain('1000,00') // No thousands separator for 1000
    expect(result2).toContain('US$')

    const result3 = formatCurrency(10000)
    expect(result3).toContain('10.000,00')
    expect(result3).toContain('US$')
  })

  it('should format decimal numbers', () => {
    const result1 = formatCurrency(99.99)
    expect(result1).toContain('99,99')
    expect(result1).toContain('US$')

    const result2 = formatCurrency(1234.56)
    expect(result2).toContain('1234,56') // No thousands separator for 1234
    expect(result2).toContain('US$')

    const result3 = formatCurrency(0.99)
    expect(result3).toContain('0,99')
    expect(result3).toContain('US$')
  })

  it('should format zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0,00')
    expect(result).toContain('US$')
  })

  it('should format negative numbers', () => {
    const result1 = formatCurrency(-50)
    expect(result1).toContain('-50,00')
    expect(result1).toContain('US$')

    const result2 = formatCurrency(-1234.56)
    expect(result2).toContain('-1234,56') // No thousands separator for 1234
    expect(result2).toContain('US$')
  })

  it('should round to two decimal places', () => {
    const result1 = formatCurrency(99.999)
    expect(result1).toContain('100,00')
    expect(result1).toContain('US$')

    const result2 = formatCurrency(99.994)
    expect(result2).toContain('99,99')
    expect(result2).toContain('US$')

    const result3 = formatCurrency(10.005)
    expect(result3).toContain('10,01')
    expect(result3).toContain('US$')
  })

  it('should handle very large numbers', () => {
    const result1 = formatCurrency(1000000)
    expect(result1).toContain('1.000.000,00')
    expect(result1).toContain('US$')

    const result2 = formatCurrency(123456789.99)
    expect(result2).toContain('123.456.789,99')
    expect(result2).toContain('US$')
  })

  it('should handle very small numbers', () => {
    const result1 = formatCurrency(0.01)
    expect(result1).toContain('0,01')
    expect(result1).toContain('US$')

    const result2 = formatCurrency(0.1)
    expect(result2).toContain('0,10')
    expect(result2).toContain('US$')
  })

  it('should use Spanish locale formatting', () => {
    // Spanish locale uses comma for decimals
    const result = formatCurrency(1234.56)
    expect(result).toContain(',56') // Decimal separator
    expect(result).toContain('1234') // Number without separator (< 10000)

    // Test with larger number to verify thousands separator
    const resultLarge = formatCurrency(12345.67)
    expect(resultLarge).toContain('12.345,67') // Thousands separator for larger numbers
  })
})
